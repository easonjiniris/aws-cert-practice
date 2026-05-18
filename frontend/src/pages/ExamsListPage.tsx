import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { CertHomeEntry, CertLevel, HomeResponse } from "../types";
import { CERT_LEVEL_LABEL, CERT_LEVELS, formatTime } from "../util";

export function ExamsListPage() {
  const [data, setData] = useState<HomeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCertId, setSelectedCertId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);

  const reload = async () => {
    try {
      const next = await api.getHome();
      setData(next);
      if (!selectedCertId && next.certs[0]) setSelectedCertId(next.certs[0].id);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    if (!data) return new Map<CertLevel, CertHomeEntry[]>();
    const m = new Map<CertLevel, CertHomeEntry[]>();
    for (const lvl of CERT_LEVELS) m.set(lvl, []);
    for (const c of data.certs) m.get(c.level)?.push(c);
    return m;
  }, [data]);

  const generate = async () => {
    if (!selectedCertId) return;
    setGenerating(true);
    setGenMessage(null);
    try {
      const result = await api.generate(selectedCertId);
      setGenMessage(
        `Created ${selectedCertId.toUpperCase()} ${result.name} with ${result.question_count} questions.`
      );
      await reload();
    } catch (e) {
      setGenMessage(`Generation failed: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (error) return <div className="p-6 text-red-600">Failed to load: {error}</div>;
  if (!data) return <div className="p-6 text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Practice exams</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedCertId}
            onChange={(e) => setSelectedCertId(e.target.value)}
            disabled={generating}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {data.certs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name.replace(/^AWS Certified /, "")}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={generate}
            disabled={generating || !selectedCertId}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate new pool"}
          </button>
        </div>
      </div>

      {generating && (
        <div className="mb-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          Calling Claude across all domains in parallel — usually 30–90 seconds. Hang on…
        </div>
      )}
      {!generating && genMessage && (
        <div className="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {genMessage}
        </div>
      )}

      {CERT_LEVELS.map((level) => {
        const certs = grouped.get(level) ?? [];
        if (certs.length === 0) return null;
        return (
          <section key={level} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {CERT_LEVEL_LABEL[level]}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {certs.map((cert) => (
                <CertCard key={cert.id} cert={cert} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CertCard({ cert }: { cert: CertHomeEntry }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {cert.code}
        </div>
        <div className="text-base font-semibold text-slate-900">
          {cert.name.replace(/^AWS Certified /, "")}
        </div>
        <div className="text-xs text-slate-500">
          {cert.question_count}q · {formatTime(cert.time_limit_seconds)} ·{" "}
          {Math.round(cert.pass_score * 100)}% to pass
        </div>
      </div>

      <div className="mb-3">
        {cert.exams.length === 0 ? (
          <div className="rounded border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
            No pools yet — pick this cert from the dropdown above and click Generate.
          </div>
        ) : (
          <ul className="space-y-1">
            {cert.exams.map((exam) => (
              <li key={exam.version}>
                <Link
                  to={`/exam/${cert.id}/${exam.version}`}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm hover:border-sky-400 hover:bg-sky-50"
                >
                  <span className="font-medium text-slate-800">{exam.name}</span>
                  <span className="text-xs text-slate-500">{exam.question_count}q</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        to={cert.special.available ? `/exam/${cert.id}/special` : "#"}
        onClick={(e) => {
          if (!cert.special.available) e.preventDefault();
        }}
        className={`block rounded-md border-2 px-3 py-2 text-center text-xs font-medium ${
          cert.special.available
            ? "border-rose-300 bg-rose-50 text-rose-800 hover:border-rose-400"
            : "cursor-not-allowed border-dashed border-slate-300 bg-slate-50 text-slate-400"
        }`}
      >
        {cert.special.available
          ? `Special exam · ${cert.special.wrong_question_count} weak spots`
          : "No weak spots tracked yet"}
      </Link>
    </div>
  );
}
