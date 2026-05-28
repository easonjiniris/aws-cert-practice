import { Router } from "express";
import {
  readAttempts,
  readPool,
  readWrong,
  resolveQuestions,
  writeAttempts,
  writeWrong,
} from "../storage.js";
import type {
  AttemptRecord,
  Question,
  WrongQuestionEntry,
} from "../types.js";

export const attemptsRouter = Router();

attemptsRouter.get("/attempts", async (_req, res) => {
  try {
    const attempts = await readAttempts();
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Fetch one attempt joined with the live question data resolved from the
// current pools. ReviewPage uses this so any pool edits (e.g. better reason
// text) appear in history immediately instead of being baked in at submit time.
attemptsRouter.get("/attempt/:id", async (req, res) => {
  try {
    const attempts = await readAttempts();
    const attempt = attempts.attempts.find((a) => a.id === req.params.id);
    if (!attempt) {
      res.status(404).json({ error: "attempt not found" });
      return;
    }
    const ids = attempt.answers.map((a) => a.question_id);
    const lookup = await resolveQuestions(attempt.cert_id, ids);
    const questions = ids
      .map((id) => lookup.get(id))
      .filter((q): q is Question => q != null);
    res.json({ attempt, questions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

attemptsRouter.post("/attempt", async (req, res) => {
  try {
    const body = req.body as Partial<AttemptRecord> & { question_snapshots?: unknown };
    if (!body || typeof body !== "object" || !body.id || !body.cert_id) {
      res.status(400).json({ error: "invalid attempt body (missing id or cert_id)" });
      return;
    }
    // Strip question_snapshots — we resolve live from the pool now.
    const { question_snapshots: _ignored, ...rest } = body;
    const attempt = rest as AttemptRecord;

    const attempts = await readAttempts();
    attempts.attempts.push(attempt);
    await writeAttempts(attempts);

    const wrong = await readWrong(attempt.cert_id);

    if (attempt.is_special) {
      const correctIds = new Set(
        attempt.answers.filter((a) => a.is_correct).map((a) => a.question_id)
      );
      wrong.questions = wrong.questions.filter(
        (q) => !correctIds.has(q.question_id)
      );
    } else {
      const wrongMap = new Map(wrong.questions.map((q) => [q.question_id, q]));
      const poolVersion = attempt.source_pool_version;
      let questionLookup: Map<string, Question> | null = null;
      if (poolVersion != null) {
        try {
          const pool = await readPool(attempt.cert_id, poolVersion);
          questionLookup = new Map(pool.questions.map((q) => [q.id, q]));
        } catch {
          questionLookup = null;
        }
      }

      for (const a of attempt.answers) {
        if (a.is_correct) continue;
        const existing = wrongMap.get(a.question_id);
        if (existing) {
          existing.times_wrong += 1;
          existing.last_wrong_at = attempt.submitted_at;
        } else {
          // Snapshot is kept for back-compat on disk but is no longer the
          // source of truth — wrong-questions/special-exam endpoints overlay
          // live pool data on top. Skip writing if no pool found.
          const snapshot = questionLookup?.get(a.question_id);
          if (!snapshot) continue;
          const entry: WrongQuestionEntry = {
            cert_id: attempt.cert_id,
            question_id: a.question_id,
            source_pool_version: poolVersion ?? 0,
            first_wrong_at: attempt.submitted_at,
            last_wrong_at: attempt.submitted_at,
            times_wrong: 1,
            snapshot,
          };
          wrongMap.set(a.question_id, entry);
        }
      }
      wrong.questions = Array.from(wrongMap.values());
    }

    await writeWrong(attempt.cert_id, wrong);
    res.json({ ok: true, attempt_id: attempt.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
