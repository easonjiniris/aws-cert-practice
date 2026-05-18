import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QuestionCard } from "../components/QuestionCard";
import { Timer } from "../components/Timer";
import { api } from "../api";
import type {
  AttemptAnswer,
  AttemptRecord,
  CertSpec,
  Question,
} from "../types";
import {
  arraysEqualAsSets,
  emptyDomainCounts,
  newAttemptId,
  shuffle,
} from "../util";

interface PreparedQuestion {
  question: Question;
  optionOrder: string[];
}

interface LoadedExam {
  cert: CertSpec;
  isSpecial: boolean;
  examName: string;
  sourcePoolVersion: number | null;
  timeLimitSeconds: number;
  passScore: number;
  shuffleOptions: boolean;
  prepared: PreparedQuestion[];
}

function prepareExam(
  questions: Question[],
  count: number,
  shuffleOptions: boolean
): PreparedQuestion[] {
  const order = shuffle(questions).slice(0, count);
  return order.map((q) => ({
    question: q,
    optionOrder: shuffleOptions ? shuffle(q.options.map((o) => o.id)) : q.options.map((o) => o.id),
  }));
}

export function ExamPage() {
  const params = useParams<{ certId: string; version: string }>();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<LoadedExam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startedAtRef = useRef<number>(Date.now());
  const startedIsoRef = useRef<string>(new Date().toISOString());
  const submittedRef = useRef(false);
  const sentinelPushedRef = useRef(false);

  useEffect(() => {
    const certId = params.certId;
    const versionRaw = params.version;
    if (!certId || !versionRaw) {
      setError("missing cert or version");
      return;
    }

    (async () => {
      try {
        if (versionRaw === "special") {
          const data = await api.getSpecial(certId);
          if (data.questions.length === 0) {
            setError("No wrong questions yet for this cert.");
            return;
          }
          startedAtRef.current = Date.now();
          startedIsoRef.current = new Date().toISOString();
          setLoaded({
            cert: data.cert,
            isSpecial: true,
            examName: "special",
            sourcePoolVersion: null,
            timeLimitSeconds: 0,
            passScore: 0,
            shuffleOptions: data.exam.shuffle_options,
            prepared: prepareExam(
              data.questions,
              data.questions.length,
              data.exam.shuffle_options
            ),
          });
          return;
        }

        const version = Number(versionRaw);
        const data = await api.getExam(certId, version);
        startedAtRef.current = Date.now();
        startedIsoRef.current = new Date().toISOString();
        setLoaded({
          cert: data.cert,
          isSpecial: false,
          examName: data.exam.name,
          sourcePoolVersion: data.pool.version,
          timeLimitSeconds: data.exam.time_limit_seconds,
          passScore: data.exam.pass_score,
          shuffleOptions: data.exam.shuffle_options,
          prepared: prepareExam(
            data.pool.questions,
            data.exam.question_count,
            data.exam.shuffle_options
          ),
        });
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [params.certId, params.version]);

  useEffect(() => {
    if (!loaded) return;

    if (!sentinelPushedRef.current) {
      window.history.pushState({ examGuard: true }, "");
      sentinelPushedRef.current = true;
    }

    const onPopState = () => {
      if (submittedRef.current) return;
      const ok = window.confirm(
        "Leave the exam? Your progress on this attempt will be lost."
      );
      if (ok) {
        window.removeEventListener("popstate", onPopState);
        setTimeout(() => window.history.back(), 0);
      } else {
        window.history.pushState({ examGuard: true }, "");
      }
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (submittedRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [loaded]);

  const toggleSelection = (questionId: string, optionId: string, isMulti: boolean) => {
    setSelections((prev) => {
      const next = { ...prev };
      const current = new Set(prev[questionId] ?? []);
      if (isMulti) {
        if (current.has(optionId)) current.delete(optionId);
        else current.add(optionId);
      } else {
        current.clear();
        current.add(optionId);
      }
      next[questionId] = current;
      return next;
    });
  };

  const toggleFlag = (questionId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleSubmit = useMemo(() => {
    return async () => {
      if (!loaded || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);

      const submittedIso = new Date().toISOString();
      const timeUsed = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));

      const perDomain = emptyDomainCounts(loaded.cert);
      let correctTotal = 0;
      const answers: AttemptAnswer[] = loaded.prepared.map((pq, idx) => {
        const q = pq.question;
        const correctIds = q.options.filter((o) => o.is_correct).map((o) => o.id);
        const selectedIds = Array.from(selections[q.id] ?? new Set<string>());
        const isCorrect = selectedIds.length > 0 && arraysEqualAsSets(selectedIds, correctIds);
        if (!perDomain[q.domain]) perDomain[q.domain] = { correct: 0, total: 0 };
        perDomain[q.domain].total += 1;
        if (isCorrect) {
          perDomain[q.domain].correct += 1;
          correctTotal += 1;
        }
        return {
          question_id: q.id,
          selected_option_ids: selectedIds,
          is_correct: isCorrect,
          question_order_index: idx,
          option_order: pq.optionOrder,
        };
      });

      const total = loaded.prepared.length;
      const score = total > 0 ? correctTotal / total : 0;
      const passed = loaded.isSpecial ? false : score >= loaded.passScore;

      const attempt: AttemptRecord = {
        id: newAttemptId(),
        cert_id: loaded.cert.id,
        exam: loaded.examName,
        is_special: loaded.isSpecial,
        source_pool_version: loaded.sourcePoolVersion,
        started_at: startedIsoRef.current,
        submitted_at: submittedIso,
        time_used_seconds: timeUsed,
        score,
        passed,
        per_domain: perDomain,
        answers,
        question_snapshots: loaded.prepared.map((p) => p.question),
      };

      try {
        await api.submitAttempt(attempt);
        sessionStorage.setItem(`attempt:${attempt.id}`, JSON.stringify(attempt));
        navigate(`/review/${attempt.id}`, { replace: true });
      } catch (e) {
        setError((e as Error).message);
        submittedRef.current = false;
        setSubmitting(false);
      }
    };
  }, [loaded, selections, navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <button
          onClick={() => navigate("/")}
          className="mb-4 text-sm text-sky-700 hover:underline"
        >
          ← Back to exams
        </button>
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      </div>
    );
  }

  if (!loaded) return <div className="p-6 text-slate-500">Loading exam…</div>;

  const pq = loaded.prepared[currentIndex];
  const answeredCount = loaded.prepared.filter(
    (p) => (selections[p.question.id]?.size ?? 0) > 0
  ).length;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {loaded.cert.code}
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            {loaded.isSpecial ? "Special exam — Weak Spots" : loaded.examName}
          </h1>
          <div className="text-sm text-slate-500">
            {answeredCount}/{loaded.prepared.length} answered
            {flagged.size > 0 && <> · {flagged.size} flagged</>}
          </div>
        </div>
        {!loaded.isSpecial && loaded.timeLimitSeconds > 0 && (
          <Timer
            startedAt={startedAtRef.current}
            durationSeconds={loaded.timeLimitSeconds}
            onExpire={handleSubmit}
          />
        )}
      </header>

      <QuestionCard
        cert={loaded.cert}
        question={pq.question}
        optionOrder={pq.optionOrder}
        selected={selections[pq.question.id] ?? new Set()}
        onToggle={(id) =>
          toggleSelection(pq.question.id, id, pq.question.type === "multiple_response")
        }
        index={currentIndex}
        total={loaded.prepared.length}
        flagged={flagged.has(pq.question.id)}
        onFlagToggle={() => toggleFlag(pq.question.id)}
      />

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        <div className="flex max-w-md flex-wrap justify-center gap-1">
          {loaded.prepared.map((p, i) => {
            const answered = (selections[p.question.id]?.size ?? 0) > 0;
            const isCurrent = i === currentIndex;
            const isFlagged = flagged.has(p.question.id);
            return (
              <button
                key={p.question.id}
                onClick={() => setCurrentIndex(i)}
                className={`h-7 w-7 rounded text-xs font-medium ${
                  isCurrent
                    ? "bg-slate-900 text-white"
                    : isFlagged
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : answered
                        ? "bg-sky-100 text-sky-800"
                        : "bg-slate-100 text-slate-600"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {currentIndex < loaded.prepared.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => Math.min(loaded.prepared.length - 1, i + 1))}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {loaded.isSpecial ? "Save & Exit" : "Submit exam"}
          </button>
        )}
      </div>
    </div>
  );
}
