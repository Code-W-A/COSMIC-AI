import type { AgentStructuredResponse } from "@/lib/agents/types"

export const agentResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "cards", "followUpQuestions"],
  properties: {
    answer: {
      type: "string",
    },
    cards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "value", "description", "items"],
        properties: {
          type: {
            type: "string",
            enum: [
              "natal_summary",
              "daily_guidance",
              "compatibility_score",
              "reflection",
              "premium_teaser",
            ],
          },
          title: {
            type: "string",
          },
          value: {
            type: ["string", "null"],
          },
          description: {
            type: ["string", "null"],
          },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "value"],
              properties: {
                label: {
                  type: "string",
                },
                value: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
    followUpQuestions: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
} as const

export function validateAgentResponse(value: unknown): AgentStructuredResponse {
  if (!value || typeof value !== "object") {
    throw new Error("AI response was not a JSON object.")
  }

  const response = value as AgentStructuredResponse

  if (
    typeof response.answer !== "string" ||
    !Array.isArray(response.cards) ||
    !Array.isArray(response.followUpQuestions)
  ) {
    throw new Error("AI response did not match the expected format.")
  }

  return {
    answer: response.answer,
    cards: response.cards,
    followUpQuestions: response.followUpQuestions,
  }
}

export function buildMissingPartnerResponse(): AgentStructuredResponse {
  return {
    answer:
      "I can look at compatibility once I have your partner's birth details. Share their birth date, birth time, and birth place so I can compare both charts symbolically.",
    cards: [
      {
        type: "compatibility_score",
        title: "Compatibility Preview",
        value: null,
        description: "Partner birth details are needed before I can read the relationship dynamics.",
        items: [
          { label: "Needed", value: "Birth date" },
          { label: "Needed", value: "Birth time" },
          { label: "Needed", value: "Birth place" },
        ],
      },
    ],
    followUpQuestions: [
      "What is your partner's birth date?",
      "What city and country were they born in?",
      "Do you know their birth time?",
    ],
  }
}
