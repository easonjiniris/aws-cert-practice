import { randomUUID } from "node:crypto";

export type GenerationJobStatus = "running" | "done" | "error" | "cancelled";

export interface GenerationJobResult {
  cert_id: string;
  version: number;
  name: string;
  question_count: number;
}

export interface GenerationJob {
  id: string;
  cert_id: string;
  version: number;
  status: GenerationJobStatus;
  completed: number;
  total: number;
  result: GenerationJobResult | null;
  error: string | null;
  controller: AbortController;
}

const jobs = new Map<string, GenerationJob>();

/** How long a finished job is kept around so the client can read its final state. */
const RETENTION_MS = 5 * 60 * 1000;

export function createJob(
  cert_id: string,
  version: number,
  total: number
): GenerationJob {
  const job: GenerationJob = {
    id: randomUUID(),
    cert_id,
    version,
    status: "running",
    completed: 0,
    total,
    result: null,
    error: null,
    controller: new AbortController(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): GenerationJob | undefined {
  return jobs.get(id);
}

/** Mark a job as finished and schedule it for eventual cleanup. */
export function finishJob(
  id: string,
  patch: Partial<Pick<GenerationJob, "status" | "result" | "error" | "completed">>
): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch);
  const timer = setTimeout(() => jobs.delete(id), RETENTION_MS);
  if (typeof timer.unref === "function") timer.unref();
}
