import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { DifficultyBadge, DomainBadge } from "../components/DomainBadge";
import type { WrongQuestionEntry } from "../types";
import { ALL_DOMAINS, DOMAIN_LABEL } from "../util";

export function WrongQuestionsPage() {
  const [entries, setEntries] = useState<WrongQuestionEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getWrong();
        setEntries(data.questions);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (domainFilter !== "all" && e.snapshot.domain !== domainFilter) return false;
      if (!q) return true;
      return (
        e.snapshot.stem.toLowerCase().includes(q) ||
        e.snapshot.options.some((o) => o.text.toLowerCase().includes(q))
      );
    });
  }, [entries, search, domainFilter]);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      </div>
    );
  }
  if (!entries) return <div className="p-6 text-slate-500">Loading…</div>;

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Wrong questions</h1>
        {entries.length > 0 && (
          <Link
            to="/exam/special"
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Take special exam ({entries.length})
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All domains</option>
          {ALL_DOMAINS.map((d) => (
            <option key={d} value={d}>
              {DOMAIN_LABEL[d]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          {entries.length === 0
            ? "No wrong questions yet — take an exam first."
            : "No questions match your filters."}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((e) => {
            const q = e.snapshot;
            const open = expanded.has(e.question_id);
            const correctIds = new Set(q.options.filter((o) => o.is_correct).map((o) => o.id));
            return (
              <li
                key={e.question_id}
                className="rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <button
                  onClick={() => toggle(e.question_id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <DomainBadge domain={q.domain} />
                      <DifficultyBadge difficulty={q.difficulty} />
                      <span className="text-slate-500">wrong × {e.times_wrong}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">
                        last {new Date(e.last_wrong_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-slate-800 line-clamp-2">{q.stem}</div>
                  </div>
                  <span className="text-slate-400">{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <div className="border-t border-slate-100 p-4">
                    <ul className="space-y-2">
                      {q.options.map((o) => {
                        const isCorrect = correctIds.has(o.id);
                        return (
                          <li
                            key={o.id}
                            className={`rounded border p-3 text-sm ${
                              isCorrect
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-slate-900">
                                <span className="mr-2 font-semibold text-slate-500">{o.id}.</span>
                                {o.text}
                              </span>
                              {isCorrect && (
                                <span className="ml-2 rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                                  correct
                                </span>
                              )}
                            </div>
                            {!isCorrect && o.reason && (
                              <p className="mt-1 text-slate-600">{o.reason}</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
