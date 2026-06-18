import Anthropic from "@anthropic-ai/sdk";
import {
  makePoolSchema,
  makeQuestionsArraySchema,
  type QuestionWithoutId,
} from "./schema.js";
import { buildPerDomainPrompt } from "./prompt.js";
import { buildSubmitQuestionsTool } from "./tool.js";
import type { CertSpec, DomainSpec, Question, QuestionPool } from "../types.js";

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY not set");
    this.name = "MissingApiKeyError";
  }
}

export class GenerationFailedError extends Error {
  constructor(message: string, public readonly domain?: string) {
    super(message);
    this.name = "GenerationFailedError";
  }
}

export class GenerationCancelledError extends Error {
  constructor() {
    super("generation cancelled");
    this.name = "GenerationCancelledError";
  }
}

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.trim().length === 0) throw new MissingApiKeyError();
  cachedClient = new Anthropic({ apiKey: key });
  return cachedClient;
}

export function hasApiKey(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  return !!key && key.trim().length > 0;
}

export function domainCounts(
  total: number,
  domains: readonly DomainSpec[]
): Record<string, number> {
  const raw = domains.map((d) => {
    const exact = total * d.weight;
    return { id: d.id, floor: Math.floor(exact), frac: exact - Math.floor(exact) };
  });
  let assigned = raw.reduce((s, r) => s + r.floor, 0);
  const byFrac = [...raw].sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (assigned < total && i < byFrac.length) {
    byFrac[i].floor += 1;
    assigned += 1;
    i = (i + 1) % byFrac.length;
  }
  const out: Record<string, number> = {};
  for (const r of raw) out[r.id] = r.floor;
  return out;
}

interface CallOpts {
  model: string;
  maxTokens: number;
  signal?: AbortSignal;
}

async function callOnce(
  cert: CertSpec,
  domain: DomainSpec,
  count: number,
  extraSystem: string,
  opts: CallOpts
): Promise<unknown> {
  const client = getClient();
  const prompt = buildPerDomainPrompt(cert, domain, count);
  const content = extraSystem ? `${prompt}\n\n${extraSystem}` : prompt;
  const tool = buildSubmitQuestionsTool(cert);

  const response = await client.messages.create(
    {
      model: opts.model,
      max_tokens: opts.maxTokens,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content }],
    },
    { signal: opts.signal }
  );

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new GenerationFailedError(
      `Claude did not return a tool_use block (stop_reason=${response.stop_reason})`,
      domain.id
    );
  }
  return (toolBlock as { input: unknown }).input;
}

export async function generateDomainQuestions(
  cert: CertSpec,
  domain: DomainSpec,
  count: number,
  opts: CallOpts
): Promise<QuestionWithoutId[]> {
  if (count <= 0) return [];

  const schema = makeQuestionsArraySchema(cert);
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (opts.signal?.aborted) throw new GenerationCancelledError();
    const extra =
      attempt === 0
        ? ""
        : `Your previous response failed validation: ${lastError}. Try again, producing EXACTLY ${count} questions and obeying every constraint above.`;
    try {
      const input = await callOnce(cert, domain, count, extra, opts);
      if (
        !input ||
        typeof input !== "object" ||
        !Array.isArray((input as { questions?: unknown }).questions)
      ) {
        lastError = "input did not contain a questions array";
        continue;
      }
      const raw = (input as { questions: unknown[] }).questions;
      const parsed = schema.safeParse(raw);
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
      const wrong = parsed.data.find((q) => q.domain !== domain.id);
      if (wrong) {
        lastError = `at least one question has domain=${wrong.domain}, expected ${domain.id}`;
        continue;
      }
      return parsed.data;
    } catch (err) {
      if (opts.signal?.aborted || err instanceof GenerationCancelledError) {
        throw new GenerationCancelledError();
      }
      if (err instanceof MissingApiKeyError) throw err;
      if (err instanceof GenerationFailedError) throw err;
      lastError = (err as Error).message;
    }
  }
  throw new GenerationFailedError(
    `Generation for domain "${domain.id}" failed: ${lastError ?? "unknown error"}`,
    domain.id
  );
}

export interface GenerateInput {
  cert: CertSpec;
  nextVersion: number;
  questionCount: number;
  signal?: AbortSignal;
  /** Called with the number of domains finished so far, as each one completes. */
  onProgress?: (completed: number) => void;
}

export interface GenerateOutput {
  pool: QuestionPool;
}

/** Number of domains that will actually trigger a Claude call for the given total. */
export function plannedDomainCount(
  questionCount: number,
  domains: readonly DomainSpec[]
): number {
  const counts = domainCounts(questionCount, domains);
  return domains.filter((d) => (counts[d.id] ?? 0) > 0).length;
}

export async function generatePool(input: GenerateInput): Promise<GenerateOutput> {
  getClient();

  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
  const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS) || 8000;

  const counts = domainCounts(input.questionCount, input.cert.domains);

  let completed = 0;
  const results = await Promise.all(
    input.cert.domains.map(async (d) => {
      const count = counts[d.id] ?? 0;
      const arr = await generateDomainQuestions(input.cert, d, count, {
        model,
        maxTokens,
        signal: input.signal,
      });
      if (count > 0) {
        completed += 1;
        input.onProgress?.(completed);
      }
      return arr;
    })
  );

  const merged: Question[] = [];
  let idx = 1;
  for (const arr of results) {
    for (const q of arr) {
      merged.push({
        id: `${input.cert.id}-v${input.nextVersion}-q${String(idx).padStart(3, "0")}`,
        domain: q.domain,
        difficulty: q.difficulty,
        type: q.type,
        stem: q.stem,
        options: q.options,
      });
      idx += 1;
    }
  }

  const weights: Record<string, number> = {};
  for (const d of input.cert.domains) weights[d.id] = d.weight;

  const pool: QuestionPool = {
    cert_id: input.cert.id,
    version: input.nextVersion,
    created_at: new Date().toISOString(),
    domain_weights: weights,
    questions: merged,
  };

  const final = makePoolSchema(input.cert).safeParse(pool);
  if (!final.success) {
    throw new GenerationFailedError(
      `Final pool failed validation: ${final.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`
    );
  }

  return { pool };
}
