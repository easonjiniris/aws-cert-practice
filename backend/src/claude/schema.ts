import { z, type ZodTypeAny } from "zod";
import type { CertSpec } from "../types.js";

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const questionTypeSchema = z.enum(["multiple_choice", "multiple_response"]);

export const optionSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    is_correct: z.boolean(),
    reason: z.string().optional(),
  })
  .superRefine((o, ctx) => {
    if (!o.is_correct && (!o.reason || o.reason.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "incorrect option must include a non-empty 'reason'",
      });
    }
  });

const questionCorrectnessCheck = (
  q: { type: "multiple_choice" | "multiple_response"; options: { is_correct: boolean }[] },
  ctx: z.RefinementCtx
) => {
  const correctCount = q.options.filter((o) => o.is_correct).length;
  if (q.type === "multiple_choice" && correctCount !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "multiple_choice must have exactly one correct option",
    });
  }
  if (q.type === "multiple_response" && correctCount < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "multiple_response must have at least two correct options",
    });
  }
};

function buildDomainSchema(cert: CertSpec): ZodTypeAny {
  const ids = cert.domains.map((d) => d.id);
  if (ids.length === 0) return z.string().min(1);
  return z.enum(ids as [string, ...string[]]);
}

export function makeQuestionWithoutIdSchema(cert: CertSpec) {
  const domain = buildDomainSchema(cert);
  return z
    .object({
      domain,
      difficulty: difficultySchema,
      type: questionTypeSchema,
      stem: z.string().min(1),
      options: z.array(optionSchema).min(4),
    })
    .superRefine(questionCorrectnessCheck);
}

export function makeQuestionsArraySchema(cert: CertSpec) {
  return z.array(makeQuestionWithoutIdSchema(cert)).min(1);
}

export function makeQuestionSchema(cert: CertSpec) {
  const domain = buildDomainSchema(cert);
  return z
    .object({
      id: z.string().min(1),
      domain,
      difficulty: difficultySchema,
      type: questionTypeSchema,
      stem: z.string().min(1),
      options: z.array(optionSchema).min(4),
    })
    .superRefine(questionCorrectnessCheck);
}

export function makePoolSchema(cert: CertSpec) {
  const domainIds = cert.domains.map((d) => d.id);
  const weightsShape = Object.fromEntries(
    domainIds.map((id) => [id, z.number()])
  );
  return z.object({
    cert_id: z.literal(cert.id),
    version: z.number().int().positive(),
    created_at: z.string().min(1),
    domain_weights: z.object(weightsShape),
    questions: z.array(makeQuestionSchema(cert)).min(1),
  });
}

export type PoolSchema<Cert extends CertSpec> = z.infer<ReturnType<typeof makePoolSchema>>;
export type QuestionWithoutId = z.infer<ReturnType<typeof makeQuestionWithoutIdSchema>>;
