import { Router } from "express";
import {
  generatePool,
  GenerationFailedError,
  MissingApiKeyError,
} from "../claude/generate.js";
import { listPoolVersions, writeExam, writePool } from "../storage.js";

export const generateRouter = Router();

generateRouter.post("/generate", async (req, res) => {
  try {
    const questionCount =
      typeof req.body?.question_count === "number" ? req.body.question_count : 65;

    const existingVersions = await listPoolVersions();
    const nextVersion = (existingVersions.at(-1) ?? 0) + 1;

    console.log(`[generate] starting v${nextVersion}, ${questionCount} questions`);
    const startedAt = Date.now();
    const { pool } = await generatePool({ nextVersion, questionCount });
    console.log(
      `[generate] got ${pool.questions.length} questions in ${Math.round(
        (Date.now() - startedAt) / 1000
      )}s — writing files`
    );

    await writePool(nextVersion, pool);
    await writeExam(nextVersion, {
      version: nextVersion,
      name: `exam_v${nextVersion}`,
      pool_ref: `question_pool_v${nextVersion}.json`,
      question_count: pool.questions.length,
      time_limit_seconds: 5400,
      pass_score: 0.7,
      shuffle_options: true,
      created_at: new Date().toISOString(),
    });

    res.json({
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
      res
        .status(502)
        .json({ error: err.message, code: "generation_failed", domain: err.domain });
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
