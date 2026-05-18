import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { ExamsListResponse } from "../types";
import { formatTime } from "../util";

export function ExamsListPage() {
  const [data, setData] = useState<ExamsListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);

  const reload = async () => {
    try {
      const next = await api.listExams();
      setData(next);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const generate = async () => {
    setGenerating(true);
    setGenMessage(null);
    try {
      const result = await api.generate();
      const qc = (result as { question_count?: number }).question_count;
      setGenMessage(
        qc
          ? `Created ${result.name} with ${qc} questions.`
          : `Created ${result.name}.`
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
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Practice exams</h1>
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate new pool"}
        </button>
      </div>

      {generating && (
        <div className="mb-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          Calling Claude across 4 domains in parallel — usually 30–60 seconds. Hang on…
        </div>
      )}
      {!generating && genMessage && (
        <div className="mb-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {genMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.exams.map((exam) => (
          <Link
            key={exam.version}
            to={`/exam/${exam.version}`}
            className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-400 hover:shadow"
          >
            <div className="mb-1 text-lg font-semibold text-slate-900">{exam.name}</div>
            <div className="text-sm text-slate-600">
              {exam.question_count} questions · {formatTime(exam.time_limit_seconds)} ·{" "}
              {Math.round(exam.pass_score * 100)}% to pass
            </div>
          </Link>
        ))}

        <Link
          to={data.special.available ? "/exam/special" : "#"}
          onClick={(e) => {
            if (!data.special.available) e.preventDefault();
          }}
          className={`block rounded-lg border-2 p-5 shadow-sm transition ${
            data.special.available
              ? "border-rose-300 bg-rose-50 hover:border-rose-400 hover:shadow"
              : "cursor-not-allowed border-dashed border-slate-300 bg-slate-50 opacity-60"
          }`}
        >
          <div className="mb-1 text-lg font-semibold text-slate-900">Special: Weak Spots</div>
          <div className="text-sm text-slate-600">
            {data.special.available
              ? `${data.special.wrong_question_count} question${data.special.wrong_question_count === 1 ? "" : "s"} from past mistakes · no timer`
              : "No weak spots tracked yet"}
          </div>
        </Link>
      </div>
    </div>
  );
}
