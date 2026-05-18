import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const DATA_DIR = path.join(REPO_ROOT, "data");
export const POOLS_DIR = path.join(DATA_DIR, "pools");
export const EXAMS_DIR = path.join(DATA_DIR, "exams");
export const WRONG_FILE = path.join(DATA_DIR, "wrong_questions.json");
export const ATTEMPTS_FILE = path.join(DATA_DIR, "attempts.json");
