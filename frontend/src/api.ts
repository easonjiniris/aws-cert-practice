import type {
  AttemptRecord,
  ExamFetchResponse,
  ExamsListResponse,
  SpecialExamResponse,
} from "./types";

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listExams: () => jsonFetch<ExamsListResponse>("/api/exams"),
  getExam: (version: number) => jsonFetch<ExamFetchResponse>(`/api/exam/${version}`),
  getSpecial: () => jsonFetch<SpecialExamResponse>("/api/special-exam"),
  getWrong: () =>
    jsonFetch<{ questions: import("./types").WrongQuestionEntry[] }>("/api/wrong-questions"),
  getAttempts: () => jsonFetch<{ attempts: AttemptRecord[] }>("/api/attempts"),
  submitAttempt: (attempt: AttemptRecord) =>
    jsonFetch<{ ok: true; attempt_id: string }>("/api/attempt", {
      method: "POST",
      body: JSON.stringify(attempt),
    }),
  generate: () =>
    jsonFetch<{ version: number; name: string }>("/api/generate", {
      method: "POST",
      body: JSON.stringify({}),
    }),
};
