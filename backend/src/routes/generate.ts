import { Router } from "express";
import {
  generatePool,
  GenerationFailedError,
  hasApiKey,
  MissingApiKeyError,
  plannedDomainCount,
} from "../claude/generate.js";
import { makePoolSchema } from "../claude/schema.js";
import {
  listPoolVersions,
  loadCert,
  writeExam,
  writePool,
} from "../storage.js";
import { createJob, finishJob, getJob } from "../jobs.js";
import type { GenerationJob, GenerationJobResult } from "../jobs.js";
import type { CertSpec, Question, QuestionPool } from "../types.js";

export const generateRouter = Router();

/** Persist a generated/imported pool plus its exam definition, and return a summary. */
async function finalizePool(
  cert: CertSpec,
  version: number,
  pool: QuestionPool
): Promise<GenerationJobResult> {
  await writePool(cert.id, version, pool);
  await writeExam(cert.id, version, {
    cert_id: cert.id,
    version,
    name: `exam_v${version}`,
    pool_ref: `question_pool_v${version}.json`,
    question_count: pool.questions.length,
    time_limit_seconds: cert.time_limit_seconds,
    pass_score: cert.pass_score,
    shuffle_options: true,
    created_at: new Date().toISOString(),
  });
  return {
    cert_id: cert.id,
    version,
    name: `exam_v${version}`,
    question_count: pool.questions.length,
  };
}

/** Run generation in the background, updating the job as domains complete. */
async function runGenerationJob(
  job: GenerationJob,
  cert: CertSpec,
  questionCount: number
): Promise<void> {
  try {
    const { pool } = await generatePool({
      cert,
      nextVersion: job.version,
      questionCount,
      signal: job.controller.signal,
      onProgress: (completed) => {
        const current = getJob(job.id);
        if (current) current.completed = completed;
      },
    });
    const result = await finalizePool(cert, job.version, pool);
    finishJob(job.id, { status: "done", result, completed: job.total });
  } catch (err) {
    if (job.controller.signal.aborted) {
      finishJob(job.id, { status: "cancelled" });
      return;
    }
    let message = (err as Error).message;
    const apiErr = err as { status?: number; message: string };
    if (
      !(err instanceof MissingApiKeyError) &&
      !(err instanceof GenerationFailedError) &&
      typeof apiErr.status === "number" &&
      apiErr.status >= 400
    ) {
      message = `Anthropic API error (${apiErr.status}): ${apiErr.message}`;
    }
    console.error(`[generate] job ${job.id} failed`, err);
    finishJob(job.id, { status: "error", error: message });
  }
}

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
  const result = await finalizePool(cert, nextVersion, validated);
  res.json(result);
});

// Start a generation job. Returns immediately with a job id; generation runs
// in the background and progress is polled via GET /generate-jobs/:jobId.
generateRouter.post("/certs/:certId/generate-job", async (req, res) => {
  const certId = req.params.certId;
  const cert = await loadCert(certId);
  if (!cert) {
    res.status(404).json({ error: `cert not found: ${certId}` });
    return;
  }
  if (!hasApiKey()) {
    res.status(400).json({ error: "ANTHROPIC_API_KEY not set", code: "missing_key" });
    return;
  }

  const questionCount =
    typeof req.body?.question_count === "number"
      ? req.body.question_count
      : cert.question_count;

  const existingVersions = await listPoolVersions(certId);
  const nextVersion = (existingVersions.at(-1) ?? 0) + 1;
  const total = plannedDomainCount(questionCount, cert.domains);

  const job = createJob(certId, nextVersion, total);
  console.log(
    `[generate] job ${job.id} starting ${certId} v${nextVersion}, ${questionCount} questions across ${total} domains`
  );
  void runGenerationJob(job, cert, questionCount);

  res.json({ jobId: job.id, total });
});

generateRouter.get("/generate-jobs/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "job not found" });
    return;
  }
  res.json({
    status: job.status,
    completed: job.completed,
    total: job.total,
    result: job.result,
    error: job.error,
  });
});

generateRouter.post("/generate-jobs/:jobId/cancel", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "job not found" });
    return;
  }
  if (job.status === "running") job.controller.abort();
  res.json({ ok: true, status: job.status });
});
