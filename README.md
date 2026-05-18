# AWS Cert Practice

Local frontend + backend app for practicing AWS certification exams (all 12 active certs as of 2026). Question pools are generated on demand by Claude.

## Setup

```bash
cp .env.example .env       # fill in ANTHROPIC_API_KEY
npm install
npm run dev                # Vite on :5173, Express on :3001
```

Open http://localhost:5173/.

## Layout

```
backend/   Express + TS API server
frontend/  React + Vite + TS UI
data/
  certs.json                              # cert registry (all 12 certs)
  attempts.json                           # global attempt history
  certs/{certId}/
    pools/question_pool_v{N}.json         # generated question pools
    exams/exam_v{N}.json                  # exam definitions
    wrong_questions.json                  # per-cert weak-spots pool
```

## How it works

- **Home page** groups certs by level (Foundational / Associate / Professional / Specialty) — see all 12 AWS certs.
- **Generate** dropdown at top of home: pick a cert, click Generate. Four (or N) parallel Claude calls produce a fresh pool, one per domain, weighted to the official exam's domain split. Pools and exams are versioned per cert (`exam_v1`, `exam_v2`, …).
- **Exam page** mimics the real exam: countdown timer, multiple-choice / multiple-response questions, flag-for-review, per-attempt question + option shuffle.
- **Wrong-questions tab** has a per-cert chooser — pick a cert to see your weak spots and take a **Special exam** drawn from just those questions. Answering one correctly removes it from the cert's weak-spots pool.
- **History tab** lists every attempt across all certs with a cert filter.

Question-pool / exam pairs are version-numbered, so retaking `exam_v1` gives you a fresh order even after `exam_v2` exists.

## Costs

Each generation calls Claude (default `claude-sonnet-4-6`) in parallel across the cert's domains. Roughly a few cents per full pool (65–75 questions). Generate at your own discretion.
