import { Router } from "express";
import {
  listExamVersions,
  loadCert,
  loadCerts,
  readAttempts,
  readExam,
  readPool,
  readWrong,
} from "../storage.js";
import type {
  AttemptRecord,
  CertSpec,
  ExamDefinition,
} from "../types.js";

export const certsRouter = Router();

certsRouter.get("/certs", async (_req, res) => {
  try {
    const certs = await loadCerts();
    res.json({ certs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

interface ExamHomeEntry extends ExamDefinition {
  latest_attempt: {
    score: number;
    passed: boolean;
    submitted_at: string;
  } | null;
}

async function summarizeExams(
  cert: CertSpec,
  attempts: AttemptRecord[]
): Promise<ExamHomeEntry[]> {
  const versions = (await listExamVersions(cert.id)).slice().reverse();
  const defs = await Promise.all(versions.map((v) => readExam(cert.id, v)));
  return defs.map((def) => {
    let latest: AttemptRecord | null = null;
    for (const a of attempts) {
      if (a.cert_id !== cert.id || a.is_special || a.exam !== def.name) continue;
      if (!latest || a.submitted_at > latest.submitted_at) latest = a;
    }
    return {
      ...def,
      latest_attempt: latest
        ? {
            score: latest.score,
            passed: latest.passed,
            submitted_at: latest.submitted_at,
          }
        : null,
    };
  });
}

certsRouter.get("/home", async (_req, res) => {
  try {
    const certs = await loadCerts();
    const attemptsFile = await readAttempts();
    const enriched = await Promise.all(
      certs.map(async (cert) => {
        const exams = await summarizeExams(cert, attemptsFile.attempts);
        const wrong = await readWrong(cert.id);
        return {
          ...cert,
          exams,
          special: {
            available: wrong.questions.length > 0,
            wrong_question_count: wrong.questions.length,
          },
        };
      })
    );
    res.json({ certs: enriched });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

certsRouter.get("/certs/:certId/exam/:version", async (req, res) => {
  const { certId } = req.params;
  const version = Number(req.params.version);
  if (!Number.isInteger(version) || version < 1) {
    res.status(400).json({ error: "invalid version" });
    return;
  }
  try {
    const cert = await loadCert(certId);
    if (!cert) {
      res.status(404).json({ error: `cert not found: ${certId}` });
      return;
    }
    const exam = await readExam(certId, version);
    const pool = await readPool(certId, version);
    res.json({ cert, exam, pool });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

certsRouter.get("/certs/:certId/wrong-questions", async (req, res) => {
  try {
    const cert = await loadCert(req.params.certId);
    if (!cert) {
      res.status(404).json({ error: `cert not found: ${req.params.certId}` });
      return;
    }
    const wrong = await readWrong(cert.id);
    res.json({ cert, ...wrong });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

certsRouter.get("/certs/:certId/special-exam", async (req, res) => {
  try {
    const cert = await loadCert(req.params.certId);
    if (!cert) {
      res.status(404).json({ error: `cert not found: ${req.params.certId}` });
      return;
    }
    const wrong = await readWrong(cert.id);
    res.json({
      cert,
      exam: {
        name: "special",
        question_count: wrong.questions.length,
        time_limit_seconds: 0,
        pass_score: 0,
        shuffle_options: true,
        is_special: true,
      },
      questions: wrong.questions.map((q) => q.snapshot),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
