import { Router } from "express";
import {
  generatePool,
  GenerationFailedError,
  MissingApiKeyError,
} from "../claude/generate.js";
import { makePoolSchema } from "../claude/schema.js";
import {
  listPoolVersions,
  loadCert,
  writeExam,
  writePool,
} from "../storage.js";
import type { Question, QuestionPool } from "../types.js";

export const generateRouter = Router();

generateRouter.post("/certs/import", async (req, res) => {
  const pool = req.body?.pool;
  if (!pool || typeof pool !== "object") {
    res.status(400).json({ error: "request body must include a 'pool' object" });
    return;
  }
  const certId = (pool as { cert_id?: unknown }).cert_id;
  if (typeof certId !== "string" || certId.length === 0) {
    res.status(400).json({ error: "pool.cert_id is required" });
    return;
  }
  const cert = await loadCert(certId);
  if (!cert) {
    res.status(404).json({ error: `cert not found: ${certId}` });
    return;
  }

  const rawQuestions = Array.isArray((pool as { questions?: unknown }).questions)
    ? ((pool as { questions: unknown[] }).questions as Array<Partial<Question>>)
    : [];

  const existingVersions = await listPoolVersions(certId);
  const nextVersion = (existingVersions.at(-1) ?? 0) + 1;

  const weights: Record<string, number> = {};
  for (const d of cert.domains) weights[d.id] = d.weight;

  const renumbered: Question[] = rawQuestions.map((q, i) => ({
    ...(q as Question),
    id: `${certId}-v${nextVersion}-q${String(i + 1).padStart(3, "0")}`,
  }));

  const candidate: QuestionPool = {
    cert_id: certId,
    version: nextVersion,
    created_at: new Date().toISOString(),
    domain_weights: weights,
    questions: renumbered,
  };

  const parsed = makePoolSchema(cert).safeParse(candidate);
  if (!parsed.success) {
    res.status(400).json({
      error: "imported pool failed validation",
      details: parsed.error.issues.slice(0, 5).map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  const validated = parsed.data as QuestionPool;
  await writePool(certId, nextVersion, validated);
  await writeExam(certId, nextVersion, {
    cert_id: certId,
    version: nextVersion,
    name: `exam_v${nextVersion}`,
    pool_ref: `question_pool_v${nextVersion}.json`,
    question_count: validated.questions.length,
    time_limit_seconds: cert.time_limit_seconds,
    pass_score: cert.pass_score,
    shuffle_options: true,
    created_at: new Date().toISOString(),
  });

  res.json({
    cert_id: certId,
    version: nextVersion,
    name: `exam_v${nextVersion}`,
    question_count: validated.questions.length,
  });
});

generateRouter.post("/certs/:certId/generate", async (req, res) => {
  const certId = req.params.certId;
  try {
    const cert = await loadCert(certId);
    if (!cert) {
      res.status(404).json({ error: `cert not found: ${certId}` });
      return;
    }

    const questionCount =
      typeof req.body?.question_count === "number"
        ? req.body.question_count
        : cert.question_count;

    const existingVersions = await listPoolVersions(certId);
    const nextVersion = (existingVersions.at(-1) ?? 0) + 1;

    console.log(`[generate] starting ${certId} v${nextVersion}, ${questionCount} questions`);
    const startedAt = Date.now();
    const { pool } = await generatePool({ cert, nextVersion, questionCount });
    console.log(
      `[generate] got ${pool.questions.length} questions in ${Math.round(
        (Date.now() - startedAt) / 1000
      )}s — writing files`
    );

    await writePool(certId, nextVersion, pool);
    await writeExam(certId, nextVersion, {
      cert_id: certId,
      version: nextVersion,
      name: `exam_v${nextVersion}`,
      pool_ref: `question_pool_v${nextVersion}.json`,
      question_count: pool.questions.length,
      time_limit_seconds: cert.time_limit_seconds,
      pass_score: cert.pass_score,
      shuffle_options: true,
      created_at: new Date().toISOString(),
    });

    res.json({
      cert_id: certId,
      version: nextVersion,
      name: `exam_v${nextVersion}`,
      question_count: pool.questions.length,
    });
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      res.status(400).json({ error: err.message, code: "missing_key" });
      return;
    }
    if (err instanceof GenerationFailedError) {
      res.status(502).json({
        error: err.message,
        code: "generation_failed",
        domain: err.domain,
      });
      return;
    }
    const apiErr = err as { status?: number; message: string };
    if (typeof apiErr.status === "number" && apiErr.status >= 400) {
      res.status(502).json({
        error: `Anthropic API error (${apiErr.status}): ${apiErr.message}`,
        code: "upstream_error",
      });
      return;
    }
    console.error("[generate] unexpected error", err);
    res.status(500).json({ error: (err as Error).message });
  }
});
