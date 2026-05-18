import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { AttemptRecord } from "../types";
import { formatTime } from "../util";

export function HistoryPage() {
  const [attempts, setAttempts] = useState<AttemptRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getAttempts();
        setAttempts([...data.attempts].reverse());
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      </div>
    );
  }
  if (!attempts) return <div className="p-6 text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Attempt history</h1>
      {attempts.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          No attempts yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Time used</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(a.submitted_at).toLocaleString()}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
