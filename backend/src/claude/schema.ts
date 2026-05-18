import { z } from "zod";

export const domainSchema = z.enum([
  "cloud_concepts",
  "security",
  "technology",
  "billing_pricing",
]);

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

export const questionSchema = z
  .object({
    id: z.string().min(1),
    domain: domainSchema,
    difficulty: difficultySchema,
    type: questionTypeSchema,
    stem: z.string().min(1),
    options: z.array(optionSchema).min(4),
  })
  .superRefine(questionCorrectnessCheck);

export const questionWithoutIdSchema = z
  .object({
    domain: domainSchema,
    difficulty: difficultySchema,
    type: questionTypeSchema,
    stem: z.string().min(1),
    options: z.array(optionSchema).min(4),
  })
  .superRefine(questionCorrectnessCheck);

export type QuestionWithoutId = z.infer<typeof questionWithoutIdSchema>;

export const questionsArraySchema = z.array(questionWithoutIdSchema).min(1);

export const domainWeightsSchema = z.object({
  cloud_concepts: z.number(),
  security: z.number(),
  technology: z.number(),
  billing_pricing: z.number(),
});

export const poolSchema = z.object({
  version: z.number().int().positive(),
  created_at: z.string().min(1),
  domain_weights: domainWeightsSchema,
  questions: z.array(questionSchema).min(1),
});

export type PoolSchema = z.infer<typeof poolSchema>;
