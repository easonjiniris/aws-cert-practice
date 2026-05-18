import { Router } from "express";
import {
  generatePool,
  GenerationFailedError,
  MissingApiKeyError,
} from "../claude/generate.js";
import {
  listPoolVersions,
  loadCert,
  writeExam,
  writePool,
} from "../storage.js";

export const generateRouter = Router();

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
