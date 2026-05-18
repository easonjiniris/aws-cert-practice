import type { CertSpec, Question } from "../types";
import { domainName } from "../util";
import { DifficultyBadge, DomainBadge } from "./DomainBadge";

interface QuestionCardProps {
  cert: CertSpec;
  question: Question;
  optionOrder: string[];
  selected: Set<string>;
  onToggle: (optionId: string) => void;
  index: number;
  total: number;
  flagged: boolean;
  onFlagToggle: () => void;
}

export function QuestionCard({
  cert,
  question,
  optionOrder,
  selected,
  onToggle,
  index,
  total,
  flagged,
  onFlagToggle,
}: QuestionCardProps) {
  const isMulti = question.type === "multiple_response";
  const correctCount = question.options.filter((o) => o.is_correct).length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Question {index + 1} of {total}
        </span>
        <div className="flex items-center gap-2">
          <DomainBadge id={question.domain} label={domainName(cert, question.domain)} />
          <DifficultyBadge difficulty={question.difficulty} />
          <button
            type="button"
            onClick={onFlagToggle}
            className={`rounded-md border px-2 py-1 text-xs font-medium ${
              flagged
                ? "border-amber-300 bg-amber-100 text-amber-800"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {flagged ? "Flagged" : "Flag for review"}
          </button>
        </div>
      </div>

      <p className="mb-2 whitespace-pre-wrap text-base text-slate-900">{question.stem}</p>
      <p className="mb-4 text-xs italic text-slate-500">
        {isMulti
          ? `Select ${correctCount} answers.`
          : "Select one answer."}
      </p>

      <ul className="space-y-2">
        {optionOrder.map((optId) => {
          const opt = question.options.find((o) => o.id === optId);
          if (!opt) return null;
          const isSelected = selected.has(optId);
          return (
            <li key={optId}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                  isSelected
                    ? "border-sky-400 bg-sky-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={`q-${question.id}`}
                  checked={isSelected}
                  onChange={() => onToggle(optId)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm text-slate-800">
                  <span className="mr-2 font-semibold text-slate-500">{optId}.</span>
                  {opt.text}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
