import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { REPO_ROOT } from "./paths.js";
import { examsRouter } from "./routes/exams.js";
import { wrongRouter } from "./routes/wrong.js";
import { attemptsRouter } from "./routes/attempts.js";
import { generateRouter } from "./routes/generate.js";
import { specialRouter } from "./routes/special.js";

dotenv.config({ path: path.join(REPO_ROOT, ".env") });

const app = express();
app.use(express.json({ limit: "5mb" }));

app.use("/api", examsRouter);
app.use("/api", wrongRouter);
app.use("/api", attemptsRouter);
app.use("/api", generateRouter);
app.use("/api", specialRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.BACKEND_PORT ?? 3001);
app.listen(port, () => {
  console.log(`backend listening on http://localhost:${port}`);
});
