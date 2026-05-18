import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { AttemptRecord, CertSpec } from "../types";
import { formatTime } from "../util";

export function HistoryPage() {
  const [attempts, setAttempts] = useState<AttemptRecord[] | null>(null);
  const [certs, setCerts] = useState<CertSpec[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      try {
        const [att, list] = await Promise.all([api.getAttempts(), api.listCerts()]);
        setAttempts([...att.attempts].reverse());
        setCerts(list.certs);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  const certById = useMemo(() => {
    const m = new Map<string, CertSpec>();
    for (const c of certs) m.set(c.id, c);
    return m;
  }, [certs]);

  const filtered = useMemo(() => {
    if (!attempts) return [];
    if (filter === "all") return attempts;
    return attempts.filter((a) => a.cert_id === filter);
  }, [attempts, filter]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!attempts) return <div className="p-6 text-slate-500">Loading…</div>;

  const certsWithHistory = Array.from(new Set(attempts.map((a) => a.cert_id)));

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Attempt history</h1>
        {certsWithHistory.length > 1 && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All certs</option>
            {certsWithHistory.map((id) => (
              <option key={id} value={id}>
                {certById.get(id)?.code ?? id}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          No attempts yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Cert</th>
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Time used</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((a) => {
                const cert = certById.get(a.cert_id);
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(a.submitted_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {cert?.code ?? a.cert_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {a.is_special ? "Special" : a.exam}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800">
                      {Math.round(a.score * 100)}%
                    </td>
                    <td className="px-4 py-3">
                      {a.is_special ? (
                        <span className="text-slate-500">—</span>
                      ) : a.passed ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          Passed
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {formatTime(a.time_used_seconds)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/review/${a.id}`}
                        className="text-sm text-sky-700 hover:underline"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
