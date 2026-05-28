import fs from "node:fs/promises";
import {
  ATTEMPTS_FILE,
  CERTS_FILE,
  certDir,
  examFile,
  examsDir,
  poolFile,
  poolsDir,
  wrongFile,
} from "./paths.js";
import type {
  AttemptsFile,
  CertSpec,
  CertsFile,
  ExamDefinition,
  Question,
  QuestionPool,
  WrongQuestionsFile,
} from "./types.js";

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw) as T;
}

async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2) + "\n", "utf-8");
  await fs.rename(tmp, file);
}

async function dirExists(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function loadCerts(): Promise<CertSpec[]> {
  const file = await readJson<CertsFile>(CERTS_FILE);
  return file.certs;
}

export async function loadCert(certId: string): Promise<CertSpec | null> {
  const certs = await loadCerts();
  return certs.find((c) => c.id === certId) ?? null;
}

export async function ensureCertDir(certId: string): Promise<void> {
  await fs.mkdir(poolsDir(certId), { recursive: true });
  await fs.mkdir(examsDir(certId), { recursive: true });
  const wf = wrongFile(certId);
  try {
    await fs.access(wf);
  } catch {
    await writeJsonAtomic(wf, { questions: [] });
  }
}

export async function listPoolVersions(certId: string): Promise<number[]> {
  if (!(await dirExists(poolsDir(certId)))) return [];
  const entries = await fs.readdir(poolsDir(certId));
  return entries
    .map((f) => /^question_pool_v(\d+)\.json$/.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

export async function listExamVersions(certId: string): Promise<number[]> {
  if (!(await dirExists(examsDir(certId)))) return [];
  const entries = await fs.readdir(examsDir(certId));
  return entries
    .map((f) => /^exam_v(\d+)\.json$/.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

export async function readPool(certId: string, version: number): Promise<QuestionPool> {
  return readJson<QuestionPool>(poolFile(certId, version));
}
export async function readExam(certId: string, version: number): Promise<ExamDefinition> {
  return readJson<ExamDefinition>(examFile(certId, version));
}
export async function writePool(
  certId: string,
  version: number,
  pool: QuestionPool
): Promise<void> {
  await ensureCertDir(certId);
  await writeJsonAtomic(poolFile(certId, version), pool);
}
export async function writeExam(
  certId: string,
  version: number,
  exam: ExamDefinition
): Promise<void> {
  await ensureCertDir(certId);
  await writeJsonAtomic(examFile(certId, version), exam);
}

export async function readWrong(certId: string): Promise<WrongQuestionsFile> {
  if (!(await dirExists(certDir(certId)))) return { questions: [] };
  try {
    return await readJson<WrongQuestionsFile>(wrongFile(certId));
  } catch {
    return { questions: [] };
  }
}

export async function writeWrong(
  certId: string,
  value: WrongQuestionsFile
): Promise<void> {
  await ensureCertDir(certId);
  await writeJsonAtomic(wrongFile(certId), value);
}

/**
 * Resolve a set of question_ids to their current Question objects by reading
 * from each id's source pool (the version is encoded in the id, e.g.
 * "ccp-v6-q012"). This is the dynamic linkage that replaces baked-in attempt
 * snapshots: history always reflects the current pool's stem/options/reasons.
 *
 * Returns a Map keyed by question_id. Ids whose pool no longer exists, or
 * whose pool no longer contains the id, are simply omitted.
 */
export async function resolveQuestions(
  certId: string,
  questionIds: readonly string[]
): Promise<Map<string, Question>> {
  const byVersion = new Map<number, Set<string>>();
  const idPattern = new RegExp(`^${certId}-v(\\d+)-q\\d+$`);
  for (const id of questionIds) {
    const m = idPattern.exec(id);
    if (!m) continue;
    const v = Number(m[1]);
    const set = byVersion.get(v) ?? new Set<string>();
    set.add(id);
    byVersion.set(v, set);
  }
  const out = new Map<string, Question>();
  await Promise.all(
    Array.from(byVersion.entries()).map(async ([version, wanted]) => {
      try {
        const pool = await readPool(certId, version);
        for (const q of pool.questions) {
          if (wanted.has(q.id)) out.set(q.id, q);
        }
      } catch {
        // pool missing — skip its ids
      }
    })
  );
  return out;
}

export async function readAttempts(): Promise<AttemptsFile> {
  try {
    return await readJson<AttemptsFile>(ATTEMPTS_FILE);
  } catch {
    return { attempts: [] };
  }
}
export async function writeAttempts(value: AttemptsFile): Promise<void> {
  await writeJsonAtomic(ATTEMPTS_FILE, value);
}
