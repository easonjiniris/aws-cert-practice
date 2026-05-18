import type { Domain } from "./types";

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

export const DOMAIN_LABEL: Record<Domain, string> = {
  cloud_concepts: "Cloud Concepts",
  security: "Security",
  technology: "Technology",
  billing_pricing: "Billing & Pricing",
};

export const DOMAIN_COLOR: Record<Domain, string> = {
  cloud_concepts: "bg-sky-100 text-sky-800 border-sky-200",
  security: "bg-rose-100 text-rose-800 border-rose-200",
  technology: "bg-violet-100 text-violet-800 border-violet-200",
  billing_pricing: "bg-amber-100 text-amber-800 border-amber-200",
};

export const ALL_DOMAINS: Domain[] = [
  "cloud_concepts",
  "security",
  "technology",
  "billing_pricing",
];

export function newAttemptId(): string {
  return `att-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

export function emptyDomainCounts(): Record<Domain, { correct: number; total: number }> {
  return {
    cloud_concepts: { correct: 0, total: 0 },
    security: { correct: 0, total: 0 },
    technology: { correct: 0, total: 0 },
    billing_pricing: { correct: 0, total: 0 },
  };
}

export function arraysEqualAsSets(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}
