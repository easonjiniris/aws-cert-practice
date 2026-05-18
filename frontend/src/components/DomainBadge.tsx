import type { Domain, Difficulty } from "../types";
import { DOMAIN_COLOR, DOMAIN_LABEL } from "../util";

export function DomainBadge({ domain }: { domain: Domain }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${DOMAIN_COLOR[domain]}`}
    >
      {DOMAIN_LABEL[domain]}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const cls =
    difficulty === "easy"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : difficulty === "medium"
        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
        : "bg-red-100 text-red-800 border-red-200";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {difficulty}
    </span>
  );
}
