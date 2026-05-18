export const SUBMIT_QUESTIONS_TOOL = {
  name: "submit_questions",
  description:
    "Submit the generated exam questions. Call exactly once with the full array.",
  input_schema: {
    type: "object" as const,
    properties: {
      questions: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              enum: ["cloud_concepts", "security", "technology", "billing_pricing"],
            },
            difficulty: {
              type: "string",
              enum: ["easy", "medium", "hard"],
            },
            type: {
              type: "string",
              enum: ["multiple_choice", "multiple_response"],
            },
            stem: { type: "string", minLength: 10 },
            options: {
              type: "array",
              minItems: 4,
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  id: { type: "string", enum: ["A", "B", "C", "D", "E"] },
                  text: { type: "string", minLength: 1 },
                  is_correct: { type: "boolean" },
                  reason: {
                    type: "string",
                    description:
                      "Required for incorrect options (explain why this option is wrong). Omit for correct options.",
                  },
                },
                required: ["id", "text", "is_correct"],
                additionalProperties: false,
              },
            },
          },
          required: ["domain", "difficulty", "type", "stem", "options"],
          additionalProperties: false,
        },
      },
    },
    required: ["questions"],
    additionalProperties: false,
  },
};
