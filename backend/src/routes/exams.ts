import { Router } from "express";
import {
  listExamVersions,
  listPoolVersions,
  readExam,
  readPool,
  readWrong,
} from "../storage.js";

export const examsRouter = Router();

examsRouter.get("/exams", async (_req, res) => {
  try {
    const examVersions = (await listExamVersions()).slice().reverse();
    const exams = await Promise.all(
      examVersions.map(async (v) => {
        const def = await readExam(v);
        return {
          version: def.version,
          name: def.name,
          question_count: def.question_count,
          time_limit_seconds: def.time_limit_seconds,
          pass_score: def.pass_score,
          created_at: def.created_at,
        };
      })
    );
    const wrong = await readWrong();
    res.json({
      exams,
      special: {
        available: wrong.questions.length > 0,
        wrong_question_count: wrong.questions.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

examsRouter.get("/exam/:version", async (req, res) => {
  const version = Number(req.params.version);
  if (!Number.isInteger(version) || version < 1) {
    res.status(400).json({ error: "invalid version" });
    return;
  }
  try {
    const exam = await readExam(version);
    const pool = await readPool(version);
    res.json({ exam, pool });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

examsRouter.get("/pools", async (_req, res) => {
  try {
    const versions = await listPoolVersions();
    res.json({ versions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
