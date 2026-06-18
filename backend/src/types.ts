export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "multiple_choice" | "multiple_response";
export type CertLevel = "foundational" | "associate" | "professional" | "specialty";

/** Phases of a generation job after it starts, in order. */
export type GenerationStage =
  | "generating"
  | "validating"
  | "writing_pool"
  | "writing_exam";

export interface DomainSpec {
  id: string;
  name: string;
  weight: number;
  description: string;
}

export interface CertSpec {
  id: string;
  name: string;
  code: string;
  level: CertLevel;
  question_count: number;
  time_limit_seconds: number;
  pass_score: number;
  domains: DomainSpec[];
  active?: boolean;
}

export interface CertsFile {
  certs: CertSpec[];
}

export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
  /** Required when is_correct=false; omitted/optional when is_correct=true. */
  reason?: string;
}

export interface Question {
  id: string;
  domain: string;
  difficulty: Difficulty;
  type: QuestionType;
  stem: string;
  options: QuestionOption[];
}

export interface QuestionPool {
  cert_id: string;
  version: number;
  created_at: string;
  domain_weights: Record<string, number>;
  questions: Question[];
}

export interface ExamDefinition {
  cert_id: string;
  version: number;
  name: string;
  pool_ref: string;
  question_count: number;
  time_limit_seconds: number;
  pass_score: number;
  shuffle_options: boolean;
  created_at: string;
}

export interface WrongQuestionEntry {
  cert_id: string;
  question_id: string;
  source_pool_version: number;
  first_wrong_at: string;
  last_wrong_at: string;
  times_wrong: number;
  snapshot: Question;
}

export interface WrongQuestionsFile {
  questions: WrongQuestionEntry[];
}

export interface AttemptAnswer {
  question_id: string;
  selected_option_ids: string[];
  is_correct: boolean;
  question_order_index: number;
  option_order: string[];
}

export interface AttemptRecord {
  id: string;
  cert_id: string;
  exam: string;
  is_special: boolean;
  source_pool_version: number | null;
  started_at: string;
  submitted_at: string;
  time_used_seconds: number;
  score: number;
  passed: boolean;
  per_domain: Record<string, { correct: number; total: number }>;
  answers: AttemptAnswer[];
}

export interface AttemptsFile {
  attempts: AttemptRecord[];
}
