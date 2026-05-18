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
- **Generate new pool** opens a modal to pick a cert; N parallel Claude calls produce a fresh pool, one per domain, weighted to the official exam's domain split. Pools and exams are versioned per cert (`exam_v1`, `exam_v2`, …).
- **Import pool** lets you upload a question-pool JSON produced elsewhere (see [Question-pool JSON format](#question-pool-json-format)). The server assigns the next version, rewrites question IDs, and validates against the cert's schema before writing the new pool and matching exam.
- **Exam page** mimics the real exam: countdown timer, multiple-choice / multiple-response questions, flag-for-review, per-attempt question + option shuffle.
- **Wrong-questions tab** has a per-cert chooser — pick a cert to see your weak spots and take a **Special exam** drawn from just those questions. Answering one correctly removes it from the cert's weak-spots pool.
- **History tab** lists every attempt across all certs with a cert filter.

Question-pool / exam pairs are version-numbered, so retaking `exam_v1` gives you a fresh order even after `exam_v2` exists.

## Question-pool JSON format

Both generated and imported pools share the same shape. When importing, the server **overrides** `version`, `created_at`, `domain_weights`, and every question's `id` (renumbered to `{cert_id}-v{N}-q{NNN}`), so those fields in your upload don't have to be accurate — but everything else must validate.

```jsonc
{
  "cert_id": "ccp",                       // must match an id in data/certs.json
  "version": 1,                           // overridden on import (next available)
  "created_at": "2026-05-18T00:00:00Z",   // overridden on import
  "domain_weights": {                     // overridden on import (taken from cert spec)
    "cloud_concepts": 0.24,
    "security_compliance": 0.30,
    "cloud_technology": 0.34,
    "billing_pricing_support": 0.12
  },
  "questions": [
    {
      "id": "anything",                   // overridden on import
      "domain": "cloud_concepts",         // must match a domain id in cert spec
      "difficulty": "easy",               // "easy" | "medium" | "hard"
      "type": "multiple_choice",          // "multiple_choice" | "multiple_response"
      "stem": "Question text…",
      "options": [
        { "id": "A", "text": "…", "is_correct": true },
        { "id": "B", "text": "…", "is_correct": false, "reason": "Why this is wrong." },
        { "id": "C", "text": "…", "is_correct": false, "reason": "…" },
        { "id": "D", "text": "…", "is_correct": false, "reason": "…" }
      ]
    }
  ]
}
```

Validation rules (enforced by the import endpoint):

- `cert_id` must match an existing cert in `data/certs.json`.
- Each question's `domain` must be one of that cert's domain ids (look in `data/certs.json` → `certs[].domains[].id`).
- `options` must contain at least **4** entries; each option needs `id`, `text`, and `is_correct`.
- Every option with `is_correct: false` must include a non-empty `reason`. Correct options may omit `reason`.
- `multiple_choice` questions must have **exactly one** correct option.
- `multiple_response` questions must have **at least two** correct options.

Tip for converting an external pool: keep the keys above and let the import endpoint renumber/version everything. If validation fails, the response lists up to 5 specific issues with the failing field paths.

## Costs

Each generation calls Claude (default `claude-sonnet-4-6`) in parallel across the cert's domains. Roughly a few cents per full pool (65–75 questions). Generate at your own discretion.
