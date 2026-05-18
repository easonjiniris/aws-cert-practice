import { Router } from "express";
import { readWrong } from "../storage.js";

export const wrongRouter = Router();

wrongRouter.get("/wrong-questions", async (_req, res) => {
  try {
    const wrong = await readWrong();
    res.json(wrong);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
