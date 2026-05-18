import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const DATA_DIR = path.join(REPO_ROOT, "data");

export const CERTS_FILE = path.join(DATA_DIR, "certs.json");
export const ATTEMPTS_FILE = path.join(DATA_DIR, "attempts.json");
export const CERTS_ROOT = path.join(DATA_DIR, "certs");

export function certDir(certId: string): string {
  return path.join(CERTS_ROOT, certId);
}
export function poolsDir(certId: string): string {
  return path.join(certDir(certId), "pools");
}
export function examsDir(certId: string): string {
  return path.join(certDir(certId), "exams");
}
export function wrongFile(certId: string): string {
  return path.join(certDir(certId), "wrong_questions.json");
}
export function poolFile(certId: string, version: number): string {
  return path.join(poolsDir(certId), `question_pool_v${version}.json`);
}
export function examFile(certId: string, version: number): string {
  return path.join(examsDir(certId), `exam_v${version}.json`);
}
