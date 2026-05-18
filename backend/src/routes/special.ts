import { Router } from "express";
import { readWrong } from "../storage.js";
import type { Question } from "../types.js";

export const specialRouter = Router();

specialRouter.get("/special-exam", async (_req, res) => {
  try {
    const wrong = await readWrong();
    const questions: Question[] = wrong.questions.map((q) => q.snapshot);
    res.json({
      exam: {
        name: "special",
        question_count: questions.length,
        time_limit_seconds: 0,
        pass_score: 0,
        shuffle_options: true,
        is_special: true,
      },
      questions,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
