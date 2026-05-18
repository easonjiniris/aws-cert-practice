import { Router } from "express";
import {
  readAttempts,
  readPool,
  readWrong,
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

attemptsRouter.post("/attempt", async (req, res) => {
  try {
    const attempt = req.body as AttemptRecord;
    if (!attempt || typeof attempt !== "object" || !attempt.id || !attempt.cert_id) {
      res.status(400).json({ error: "invalid attempt body (missing id or cert_id)" });
      return;
    }

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
