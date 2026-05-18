import fs from "node:fs/promises";
import path from "node:path";
import {
  ATTEMPTS_FILE,
  EXAMS_DIR,
  POOLS_DIR,
  WRONG_FILE,
} from "./paths.js";
import type {
  AttemptsFile,
  ExamDefinition,
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

export async function listPoolVersions(): Promise<number[]> {
  const entries = await fs.readdir(POOLS_DIR);
  return entries
    .map((f) => /^question_pool_v(\d+)\.json$/.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

export async function listExamVersions(): Promise<number[]> {
  const entries = await fs.readdir(EXAMS_DIR);
  return entries
    .map((f) => /^exam_v(\d+)\.json$/.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

export function poolFile(version: number): string {
  return path.join(POOLS_DIR, `question_pool_v${version}.json`);
}

export function examFile(version: number): string {
  return path.join(EXAMS_DIR, `exam_v${version}.json`);
}

export async function readPool(version: number): Promise<QuestionPool> {
  return readJson<QuestionPool>(poolFile(version));
}

export async function readExam(version: number): Promise<ExamDefinition> {
  return readJson<ExamDefinition>(examFile(version));
}

export async function writePool(version: number, pool: QuestionPool): Promise<void> {
  await writeJsonAtomic(poolFile(version), pool);
}

export async function writeExam(version: number, exam: ExamDefinition): Promise<void> {
  await writeJsonAtomic(examFile(version), exam);
}

export async function readWrong(): Promise<WrongQuestionsFile> {
  return readJson<WrongQuestionsFile>(WRONG_FILE);
}

export async function writeWrong(value: WrongQuestionsFile): Promise<void> {
  await writeJsonAtomic(WRONG_FILE, value);
}

export async function readAttempts(): Promise<AttemptsFile> {
  return readJson<AttemptsFile>(ATTEMPTS_FILE);
}

export async function writeAttempts(value: AttemptsFile): Promise<void> {
  await writeJsonAtomic(ATTEMPTS_FILE, value);
}
