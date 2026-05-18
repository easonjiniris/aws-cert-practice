import type { CertLevel, CertSpec } from "./types";

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function formatTime(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function newAttemptId(): string {
  return `att-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

export function emptyDomainCounts(
  cert: CertSpec
): Record<string, { correct: number; total: number }> {
  const out: Record<string, { correct: number; total: number }> = {};
  for (const d of cert.domains) out[d.id] = { correct: 0, total: 0 };
  return out;
}

export function arraysEqualAsSets(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

export function domainName(cert: CertSpec, domainId: string): string {
  return cert.domains.find((d) => d.id === domainId)?.name ?? domainId;
}

const PALETTE = [
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-violet-100 text-violet-800 border-violet-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function domainColor(domainId: string): string {
  return PALETTE[hash(domainId) % PALETTE.length];
}

export const CERT_LEVELS: CertLevel[] = [
  "foundational",
  "associate",
  "professional",
  "specialty",
];

export const CERT_LEVEL_LABEL: Record<CertLevel, string> = {
  foundational: "Foundational",
  associate: "Associate",
  professional: "Professional",
  specialty: "Specialty",
};
