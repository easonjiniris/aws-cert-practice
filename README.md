# AWS Cloud Practitioner Exam Practice

Local frontend + backend app for practicing the AWS Certified Cloud Practitioner (CLF-C02) exam.

## Setup

```bash
cp .env.example .env       # then fill in ANTHROPIC_API_KEY (not needed yet — generation is stubbed)
npm install                # installs both workspaces
npm run dev                # Vite on :5173, Express on :3001 (Vite proxies /api)
```

Open http://localhost:5173/.

## Layout

```
backend/   Express + TS API server
frontend/  React + Vite + TS UI
data/      JSON files: pools, exams, wrong_questions, attempts
```

## Question pool / exam versioning

- `data/pools/question_pool_v{N}.json` — pool of questions for exam version N
- `data/exams/exam_v{N}.json` — exam definition (count, timer, pool ref)
- `data/wrong_questions.json` — questions you've gotten wrong (powers the Special exam)
- `data/attempts.json` — every completed attempt with answers, score, per-domain breakdown

The "Generate new pool" button (UI scaffolding ready, Claude call stubbed) will create the next `_v{N+1}` pool + exam pair.
