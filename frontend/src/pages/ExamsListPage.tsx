import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { CertHomeEntry, CertLevel, HomeResponse } from "../types";
import { CERT_LEVEL_LABEL, CERT_LEVELS, formatTime, scoreColorScale } from "../util";

export function ExamsListPage() {
  const [data, setData] = useState<HomeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCertId, setSelectedCertId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const reload = async () => {
    try {
      const next = await api.getHome();
      setData(next);
      if (!selectedCertId) {
        const firstActive = next.certs.find((c) => c.active !== false) ?? next.certs[0];
        if (firstActive) setSelectedCertId(firstActive.id);
      }
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

  const onImportFile = async (file: File) => {
    setImporting(true);
    setGenMessage(null);
    try {
      const text = await file.text();
      let pool: unknown;
      try {
        pool = JSON.parse(text);
      } catch {
        throw new Error("file is not valid JSON");
      }
      const result = await api.importPool(pool);
      setGenMessage(
        `Imported ${result.cert_id.toUpperCase()} ${result.name} with ${result.question_count} questions.`
      );
      await reload();
    } catch (e) {
      setGenMessage(`Import failed: ${(e as Error).message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const generate = async () => {
    if (!selectedCertId) return;
    setPickerOpen(false);
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
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImportFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={generating || importing}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import pool"}
          </button>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={generating || importing}
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
      {importing && (
        <div className="mb-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          Importing pool — validating and writing files…
        </div>
      )}
      {!generating && !importing && genMessage && (
        <div className="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {genMessage}
        </div>
      )}

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              Generate new pool
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Pick which certification to generate fresh questions for.
            </p>
            <label
              htmlFor="cert-picker"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Certification
            </label>
            <select
              id="cert-picker"
              value={selectedCertId}
              onChange={(e) => setSelectedCertId(e.target.value)}
              className="mb-5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              autoFocus
            >
              {data.certs.map((c) => {
                const inactive = c.active === false;
                return (
                  <option key={c.id} value={c.id} disabled={inactive}>
                    {c.code} — {c.name.replace(/^AWS Certified /, "")}
                    {inactive ? " (not active)" : ""}
                  </option>
                );
              })}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={!selectedCertId}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generate
              </button>
            </div>
          </div>
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
  const inactive = cert.active === false;
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${
        inactive ? "opacity-50 grayscale pointer-events-none select-none" : ""
      }`}
      aria-disabled={inactive || undefined}
    >
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
            No pools yet — click Generate new pool above and pick this cert.
          </div>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {cert.exams.map((exam) => {
              const latest = exam.latest_attempt;
              const attempted = latest !== null;
              const scoreColors = attempted
                ? scoreColorScale(latest.score, cert.pass_score)
                : null;
              const containerClass = scoreColors
                ? scoreColors.container
                : "border-slate-200 bg-slate-50 hover:border-sky-400 hover:bg-sky-50";
              const titleClass = scoreColors ? scoreColors.title : "text-slate-800";
              const pctClass = scoreColors ? scoreColors.pct : "text-slate-500";
              return (
                <li key={exam.version}>
                  <Link
                    to={`/exam/${cert.id}/${exam.version}`}
                    className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${containerClass}`}
                  >
                    <span className={`font-medium ${titleClass}`}>{exam.name}</span>
                    <span className="flex items-center gap-2 text-xs">
                      {latest && (
                        <span className={`font-semibold ${pctClass}`}>
                          {Math.round(latest.score * 100)}%
                        </span>
                      )}
                      <span className="text-slate-500">{exam.question_count}q</span>
                    </span>
                  </Link>
                </li>
              );
            })}
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
