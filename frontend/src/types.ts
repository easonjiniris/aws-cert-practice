export type Domain = "cloud_concepts" | "security" | "technology" | "billing_pricing";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "multiple_choice" | "multiple_response";

export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
  /** Required when is_correct=false; omitted when is_correct=true. */
  reason?: string;
}

export interface Question {
  id: string;
  domain: Domain;
  difficulty: Difficulty;
  type: QuestionType;
  stem: string;
  options: QuestionOption[];
}

export interface ExamSummary {
  version: number;
  name: string;
  question_count: number;
  time_limit_seconds: number;
  pass_score: number;
  created_at: string;
}

export interface ExamsListResponse {
  exams: ExamSummary[];
  special: { available: boolean; wrong_question_count: number };
}

export interface ExamDefinition {
  version: number;
  name: string;
  pool_ref: string;
  question_count: number;
  time_limit_seconds: number;
  pass_score: number;
  shuffle_options: boolean;
  created_at: string;
}

export interface QuestionPool {
  version: number;
  created_at: string;
  domain_weights: Record<Domain, number>;
  questions: Question[];
}

export interface ExamFetchResponse {
  exam: ExamDefinition;
  pool: QuestionPool;
}

export interface SpecialExamResponse {
  exam: {
    name: "special";
    question_count: number;
    time_limit_seconds: 0;
    pass_score: 0;
    shuffle_options: boolean;
    is_special: true;
  };
  questions: Question[];
}

export interface WrongQuestionEntry {
  question_id: string;
  source_pool_version: number;
  first_wrong_at: string;
  last_wrong_at: string;
  times_wrong: number;
  snapshot: Question;
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
  exam: string;
  is_special: boolean;
  source_pool_version: number | null;
  started_at: string;
  submitted_at: string;
  time_used_seconds: number;
  score: number;
  passed: boolean;
  per_domain: Record<Domain, { correct: number; total: number }>;
  answers: AttemptAnswer[];
  question_snapshots?: Question[];
}
