import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { DifficultyBadge, DomainBadge } from "../components/DomainBadge";
import type { AttemptRecord, CertSpec, Question } from "../types";
import { domainName, formatTime } from "../util";

export function ReviewPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<AttemptRecord | null>(null);
  const [cert, setCert] = useState<CertSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wrongOnly, setWrongOnly] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      try {
        const detail = await api.getAttempt(attemptId);
        setAttempt(detail.attempt);
        setQuestions(detail.questions);
        const list = await api.listCerts();
        setCert(list.certs.find((c) => c.id === detail.attempt.cert_id) ?? null);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [attemptId]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Link to="/" className="mb-4 inline-block text-sm text-sky-700 hover:underline">
          ← Back to exams
        </Link>
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      </div>
    );
  }
  if (!attempt || !cert) return <div className="p-6 text-slate-500">Loading…</div>;

  const byId = new Map(questions.map((q) => [q.id, q]));
  const percent = Math.round(attempt.score * 100);
  const total = attempt.answers.length;
  const answered = attempt.answers.filter((a) => a.selected_option_ids.length > 0).length;
  const correctCount = attempt.answers.filter((a) => a.is_correct).length;
  const notAnswered = total - answered;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link to="/" className="mb-4 inline-block text-sm text-sky-700 hover:underline">
        ← Back to exams
      </Link>

      <div
        className={`mb-6 rounded-lg border p-6 shadow-sm ${
          attempt.is_special
            ? "border-slate-200 bg-white"
            : attempt.passed
              ? "border-emerald-300 bg-emerald-50"
              : "border-red-300 bg-red-50"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {cert.code} · {cert.name.replace(/^AWS Certified /, "")}
            </div>
            <div className="mt-1 text-sm uppercase tracking-wide text-slate-500">
              {attempt.is_special
                ? "Special exam result"
                : attempt.passed
                  ? "Passed"
                  : "Did not pass"}
            </div>
            {attempt.is_special ? (
              <>
                <div className="text-4xl font-bold text-slate-900">
                  {correctCount}/{answered} · {notAnswered}
                </div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  correct / answered · not answered
                </div>
              </>
            ) : (
              <div className="text-4xl font-bold text-slate-900">{percent}%</div>
            )}
            <div className="text-sm text-slate-600">
              {attempt.exam} · {formatTime(attempt.time_used_seconds)} used ·{" "}
              {new Date(attempt.submitted_at).toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm">
            {cert.domains.map((d) => {
              const c = attempt.per_domain[d.id];
              if (!c || c.total === 0) return null;
              return (
                <div key={d.id} className="flex items-center gap-2">
                  <span className="text-slate-500">{d.name}</span>
                  <span className="font-mono text-slate-800">
                    {c.correct}/{c.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Question review</h2>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={wrongOnly}
            onChange={(e) => setWrongOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          Show wrong only
        </label>
      </div>
      <ol className="space-y-4">
        {attempt.answers.map((a, idx) => {
          const isIncomplete = a.selected_option_ids.length === 0;
          if (wrongOnly && (a.is_correct || isIncomplete)) return null;
          const q = byId.get(a.question_id);
          if (!q) {
            return (
              <li
                key={a.question_id}
                className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500"
              >
                Question unavailable for {a.question_id} — its source pool may have been removed.
              </li>
            );
          }
          const correctIds = new Set(q.options.filter((o) => o.is_correct).map((o) => o.id));
          const selectedIds = new Set(a.selected_option_ids);
          const borderClass = isIncomplete
            ? "border-amber-200"
            : a.is_correct
              ? "border-emerald-200"
              : "border-red-200";
          const badgeClass = isIncomplete
            ? "bg-amber-100 text-amber-800"
            : a.is_correct
              ? "bg-emerald-100 text-emerald-800"
              : "bg-red-100 text-red-800";
          const badgeLabel = isIncomplete ? "Incomplete" : a.is_correct ? "Correct" : "Incorrect";
          return (
            <li
              key={a.question_id}
              className={`rounded-lg border p-5 shadow-sm ${borderClass} bg-white`}
            >
              <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                <span>Question {idx + 1}</span>
                <div className="flex items-center gap-2">
                  <DomainBadge id={q.domain} label={domainName(cert, q.domain)} />
                  <DifficultyBadge difficulty={q.difficulty} />
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}
                  >
                    {badgeLabel}
                  </span>
                </div>
              </div>

              <p className="mb-3 whitespace-pre-wrap text-base text-slate-900">{q.stem}</p>

              <ul className="space-y-2">
                {a.option_order.map((optId) => {
                  const opt = q.options.find((o) => o.id === optId);
                  if (!opt) return null;
                  const isCorrect = correctIds.has(optId);
                  const wasSelected = selectedIds.has(optId);
                  const cls = isCorrect
                    ? "border-emerald-300 bg-emerald-50"
                    : wasSelected
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200 bg-slate-50";
                  return (
                    <li key={optId} className={`rounded-md border p-3 ${cls}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-900">
                          <span className="mr-2 font-semibold text-slate-500">{optId}.</span>
                          {opt.text}
                        </span>
                        <span className="ml-3 flex shrink-0 gap-2 text-xs">
                          {wasSelected && (
                            <span className="rounded-full bg-sky-200 px-2 py-0.5 font-semibold text-sky-900">
                              your answer
                            </span>
                          )}
                          {isCorrect && (
                            <span className="rounded-full bg-emerald-200 px-2 py-0.5 font-semibold text-emerald-900">
                              correct
                            </span>
                          )}
                        </span>
                      </div>
                      {!isCorrect && opt.reason && (
                        <p className="mt-1 text-sm text-slate-600">{opt.reason}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
