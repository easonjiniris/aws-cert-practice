import Anthropic from "@anthropic-ai/sdk";
import {
  poolSchema,
  questionsArraySchema,
  type PoolSchema,
  type QuestionWithoutId,
} from "./schema.js";
import { buildPerDomainPrompt } from "./prompt.js";
import { SUBMIT_QUESTIONS_TOOL } from "./tool.js";
import type { Domain, Question } from "../types.js";

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY not set");
    this.name = "MissingApiKeyError";
  }
}

export class GenerationFailedError extends Error {
  constructor(message: string, public readonly domain?: Domain) {
    super(message);
    this.name = "GenerationFailedError";
  }
}

const ALL_DOMAINS: Domain[] = [
  "cloud_concepts",
  "security",
  "technology",
  "billing_pricing",
];

const DEFAULT_WEIGHTS: Record<Domain, number> = {
  cloud_concepts: 0.24,
  security: 0.30,
  technology: 0.34,
  billing_pricing: 0.12,
};

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.trim().length === 0) throw new MissingApiKeyError();
  cachedClient = new Anthropic({ apiKey: key });
  return cachedClient;
}

export function domainCounts(
  total: number,
  weights: Record<Domain, number>
): Record<Domain, number> {
  const raw = ALL_DOMAINS.map((d) => {
    const exact = total * weights[d];
    return { d, floor: Math.floor(exact), frac: exact - Math.floor(exact) };
  });
  let assigned = raw.reduce((s, r) => s + r.floor, 0);
  const byFrac = [...raw].sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (assigned < total && i < byFrac.length) {
    byFrac[i].floor += 1;
    assigned += 1;
    i += 1;
  }
  const out: Partial<Record<Domain, number>> = {};
  for (const r of raw) out[r.d] = r.floor;
  return out as Record<Domain, number>;
}

interface CallOpts {
  model: string;
  maxTokens: number;
}

async function callOnce(
  domain: Domain,
  count: number,
  extraSystem: string,
  opts: CallOpts
): Promise<unknown> {
  const client = getClient();
  const prompt = buildPerDomainPrompt(domain, count);
  const system = extraSystem ? `${prompt}\n\n${extraSystem}` : prompt;

  const response = await client.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens,
    tools: [SUBMIT_QUESTIONS_TOOL],
    tool_choice: { type: "tool", name: SUBMIT_QUESTIONS_TOOL.name },
    messages: [
      {
        role: "user",
        content: system,
      },
    ],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new GenerationFailedError(
      `Claude did not return a tool_use block (stop_reason=${response.stop_reason})`,
      domain
    );
  }
  return (toolBlock as { input: unknown }).input;
}

export async function generateDomainQuestions(
  domain: Domain,
  count: number,
  opts: CallOpts
): Promise<QuestionWithoutId[]> {
  if (count <= 0) return [];

  let lastError: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const extraSystem =
      attempt === 0
        ? ""
        : `Your previous response failed validation: ${lastError}. Try again, producing EXACTLY ${count} questions and obeying every constraint above.`;
    try {
      const input = await callOnce(domain, count, extraSystem, opts);
      if (!input || typeof input !== "object" || !Array.isArray((input as { questions?: unknown }).questions)) {
        lastError = "input did not contain a questions array";
        continue;
      }
      const rawQuestions = (input as { questions: unknown[] }).questions;
      const parsed = questionsArraySchema.safeParse(rawQuestions);
      if (!parsed.success) {
        lastError = parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        continue;
      }
      if (parsed.data.length !== count) {
        lastError = `expected ${count} questions, got ${parsed.data.length}`;
        continue;
      }
      const wrongDomain = parsed.data.find((q) => q.domain !== domain);
      if (wrongDomain) {
        lastError = `at least one question has domain=${wrongDomain.domain}, expected ${domain}`;
        continue;
      }
      return parsed.data;
    } catch (err) {
      if (err instanceof MissingApiKeyError) throw err;
      if (err instanceof GenerationFailedError) throw err;
      lastError = (err as Error).message;
    }
  }

  throw new GenerationFailedError(
    `Generation for domain "${domain}" failed: ${lastError ?? "unknown error"}`,
    domain
  );
}

export interface GenerateInput {
  nextVersion: number;
  questionCount: number;
}

export interface GenerateOutput {
  pool: PoolSchema;
}

export async function generatePool(input: GenerateInput): Promise<GenerateOutput> {
  getClient();

  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
  const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS) || 8000;

  const counts = domainCounts(input.questionCount, DEFAULT_WEIGHTS);

  const results = await Promise.all(
    ALL_DOMAINS.map((d) =>
      generateDomainQuestions(d, counts[d], { model, maxTokens })
    )
  );

  const merged: Question[] = [];
  let idx = 1;
  for (const arr of results) {
    for (const q of arr) {
      merged.push({
        id: `v${input.nextVersion}-q${String(idx).padStart(3, "0")}`,
        domain: q.domain,
        difficulty: q.difficulty,
        type: q.type,
        stem: q.stem,
        options: q.options,
      });
      idx += 1;
    }
  }

  const pool: PoolSchema = {
    version: input.nextVersion,
    created_at: new Date().toISOString(),
    domain_weights: DEFAULT_WEIGHTS,
    questions: merged,
  };

  const finalCheck = poolSchema.safeParse(pool);
  if (!finalCheck.success) {
    throw new GenerationFailedError(
      `Final pool failed validation: ${finalCheck.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`
    );
  }

  return { pool: finalCheck.data };
}
