import type { CertSpec, DomainSpec } from "../types.js";

export function buildPerDomainPrompt(
  cert: CertSpec,
  domain: DomainSpec,
  count: number
): string {
  const mrCount = count >= 4 ? Math.max(1, Math.round(count * 0.15)) : 0;
  const mcCount = count - mrCount;

  const easy = Math.round(count * 0.3);
  const hard = Math.round(count * 0.2);
  const medium = Math.max(0, count - easy - hard);

  return `You are an AWS certification exam writer. Generate ${count} practice questions for the **${cert.name}** exam (${cert.code}) in the **${domain.name}** domain.

DOMAIN SCOPE
${domain.description}

QUESTION FORMATS — produce both formats in this exact mix:
- ${mcCount} questions of type "multiple_choice": exactly 4 options (ids A, B, C, D), exactly ONE option with is_correct=true.
- ${mrCount} questions of type "multiple_response": exactly 5 options (ids A, B, C, D, E), TWO OR MORE options with is_correct=true. If multi-response, the stem should say "(Choose TWO.)" or "(Choose THREE.)" matching the number of correct answers.

DIFFICULTY MIX (approximate):
- ${easy} easy, ${medium} medium, ${hard} hard.

STYLE
- Match the look and tone of real ${cert.code} questions: concise scenario-based stems, vendor-neutral phrasing, plausible distractors (other AWS services that sound related but don't fit), no trick wording.
- For every INCORRECT option (is_correct=false), include a "reason" field (1–2 sentences) explaining why that option is wrong, referencing the relevant AWS service or concept. Reasons should be informative enough to study from.
- For CORRECT options (is_correct=true), OMIT the "reason" field entirely — no explanation needed.
- Vary topics within the domain — do NOT generate multiple questions about the same service unless it is genuinely central to the domain.

CONSTRAINTS
- Every question's "domain" field MUST be "${domain.id}".
- Do not include an "id" field on questions — the caller will assign ids.
- Return your output by calling the "submit_questions" tool exactly once with the full array of ${count} questions.`;
}
