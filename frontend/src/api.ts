import type {
  AttemptRecord,
  CertsListResponse,
  ExamFetchResponse,
  HomeResponse,
  SpecialExamResponse,
  WrongQuestionsResponse,
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
  listCerts: () => jsonFetch<CertsListResponse>("/api/certs"),
  getHome: () => jsonFetch<HomeResponse>("/api/home"),
  getExam: (certId: string, version: number) =>
    jsonFetch<ExamFetchResponse>(`/api/certs/${certId}/exam/${version}`),
  getSpecial: (certId: string) =>
    jsonFetch<SpecialExamResponse>(`/api/certs/${certId}/special-exam`),
  getWrong: (certId: string) =>
    jsonFetch<WrongQuestionsResponse>(`/api/certs/${certId}/wrong-questions`),
  getAttempts: () => jsonFetch<{ attempts: AttemptRecord[] }>("/api/attempts"),
  submitAttempt: (attempt: AttemptRecord) =>
    jsonFetch<{ ok: true; attempt_id: string }>("/api/attempt", {
      method: "POST",
      body: JSON.stringify(attempt),
    }),
  generate: (certId: string) =>
    jsonFetch<{ cert_id: string; version: number; name: string; question_count: number }>(
      `/api/certs/${certId}/generate`,
      { method: "POST", body: JSON.stringify({}) }
    ),
};
