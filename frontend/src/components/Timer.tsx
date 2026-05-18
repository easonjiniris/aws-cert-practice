import { useEffect, useState } from "react";
import { formatTime } from "../util";

interface TimerProps {
  startedAt: number;
  durationSeconds: number;
  onExpire: () => void;
}

export function Timer({ startedAt, durationSeconds, onExpire }: TimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.floor((now - startedAt) / 1000);
  const remaining = durationSeconds - elapsed;

  useEffect(() => {
    if (remaining <= 0) onExpire();
  }, [remaining, onExpire]);

  const danger = remaining <= 300;

  return (
    <div
      className={`rounded-md border px-3 py-1.5 font-mono text-lg tabular-nums ${
        danger
          ? "border-red-300 bg-red-50 text-red-700"
          : "border-slate-300 bg-white text-slate-700"
      }`}
    >
      {formatTime(remaining)}
    </div>
  );
}
