import type { Difficulty } from "../types";
import { domainColor } from "../util";

export function DomainBadge({ id, label }: { id: string; label: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${domainColor(id)}`}
    >
      {label}
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
