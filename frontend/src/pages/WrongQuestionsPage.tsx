import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { DifficultyBadge, DomainBadge } from "../components/DomainBadge";
import type { CertSpec, HomeResponse, WrongQuestionEntry } from "../types";
import { CERT_LEVEL_LABEL, CERT_LEVELS, domainName, domainPalette } from "../util";

export function WrongQuestionsChooserPage() {
  const [data, setData] = useState<HomeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await api.getHome());
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6 text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Wrong questions</h1>

      {CERT_LEVELS.map((level) => {
        const certs = data.certs.filter((c) => c.level === level);
        if (certs.length === 0) return null;
        return (
          <section key={level} className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {CERT_LEVEL_LABEL[level]}
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {certs.map((cert) => {
                const count = cert.special.wrong_question_count;
                return (
                  <Link
                    key={cert.id}
                    to={count > 0 ? `/wrong/${cert.id}` : "#"}
                    onClick={(e) => {
                      if (count === 0) e.preventDefault();
                    }}
                    className={`block rounded-lg border p-4 shadow-sm transition ${
                      count > 0
                        ? "border-rose-300 bg-rose-50 hover:border-rose-400"
                        : "cursor-not-allowed border-dashed border-slate-300 bg-slate-50 opacity-60"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      {cert.code}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {cert.name.replace(/^AWS Certified /, "")}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {count > 0
                        ? `${count} weak spot${count === 1 ? "" : "s"}`
                        : "No weak spots"}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function WrongQuestionsCertPage() {
  const { certId } = useParams<{ certId: string }>();
  const [cert, setCert] = useState<CertSpec | null>(null);
  const [entries, setEntries] = useState<WrongQuestionEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!certId) return;
    (async () => {
      try {
        const data = await api.getWrong(certId);
        setCert(data.cert);
        setEntries(data.questions);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [certId]);

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

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!cert || !entries) return <div className="p-6 text-slate-500">Loading…</div>;

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Link to="/wrong" className="text-sm text-sky-700 hover:underline">
        ← All certs
      </Link>
      <div className="mb-4 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">{cert.code}</div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {cert.name.replace(/^AWS Certified /, "")} — Weak Spots
          </h1>
        </div>
        {entries.length > 0 && (
          <Link
            to={`/exam/${cert.id}/special`}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Take special exam ({entries.length})
          </Link>
        )}
      </div>

      {entries.length > 0 && <WrongTopicChart cert={cert} entries={entries} />}

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
          {cert.domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
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
                      <DomainBadge id={q.domain} label={domainName(cert, q.domain)} />
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

/**
 * Horizontal stacked bar: the share of wrong questions belonging to each topic
 * (domain), each segment coloured with the topic's assigned palette colour.
 */
function WrongTopicChart({
  cert,
  entries,
}: {
  cert: CertSpec;
  entries: WrongQuestionEntry[];
}) {
  const total = entries.length;

  const segments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      counts.set(e.snapshot.domain, (counts.get(e.snapshot.domain) ?? 0) + 1);
    }
    // Cert domains first (canonical order), then any stray ids not in the spec.
    const ids = [
      ...cert.domains.map((d) => d.id),
      ...[...counts.keys()].filter((id) => !cert.domains.some((d) => d.id === id)),
    ];
    return ids
      .map((id) => ({
        id,
        name: domainName(cert, id),
        count: counts.get(id) ?? 0,
        palette: domainPalette(id),
      }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [cert, entries]);

  if (total === 0) return null;

  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Weak spots by topic</h2>
        <span className="text-xs text-slate-500">
          {total} wrong question{total === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex h-3 w-full gap-0.5" role="img" aria-label="Wrong questions by topic">
        {segments.map((s, i) => (
          <div
            key={s.id}
            className={`h-full ${s.palette.bar} ${i === 0 ? "rounded-l-full" : ""} ${
              i === segments.length - 1 ? "rounded-r-full" : ""
            }`}
            style={{ flexGrow: s.count, flexBasis: 0 }}
            title={`${s.name}: ${s.count} (${pct(s.count)}%)`}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
        {segments.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5 text-xs">
            <DomainBadge id={s.id} label={s.name} />
            <span className="text-slate-400">
              {s.count} · {pct(s.count)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
