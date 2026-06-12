import { stripMarkdownFormatting } from "@/lib/chat/plain-text"
import { agentTypes } from "@/types/agent"
import type { AgentStructuredResponse } from "@/lib/agents/types"

export const agentResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "answer",
    "cards",
    "followUpQuestions",
    "suggestedAgent",
    "agentHandoffReason",
    "suggestedQuestion",
  ],
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
    suggestedAgent: {
      type: ["string", "null"],
      enum: [...agentTypes, null],
    },
    agentHandoffReason: {
      type: ["string", "null"],
    },
    suggestedQuestion: {
      type: ["string", "null"],
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

  const suggestedAgent =
    response.suggestedAgent === null || agentTypes.includes(response.suggestedAgent as (typeof agentTypes)[number])
      ? response.suggestedAgent
      : null
  const agentHandoffReason =
    response.agentHandoffReason === null || typeof response.agentHandoffReason === "string"
      ? response.agentHandoffReason
      : null
  const suggestedQuestion =
    response.suggestedQuestion === null || typeof response.suggestedQuestion === "string"
      ? response.suggestedQuestion
      : null

  return {
    answer: stripMarkdownFormatting(response.answer),
    cards: response.cards.map((card) => ({
      ...card,
      title: stripMarkdownFormatting(card.title),
      value: card.value ? stripMarkdownFormatting(card.value) : card.value,
      description: card.description ? stripMarkdownFormatting(card.description) : card.description,
      items: (card.items ?? []).map((item) => ({
        label: stripMarkdownFormatting(item.label),
        value: stripMarkdownFormatting(item.value),
      })),
    })),
    followUpQuestions: response.followUpQuestions.map(stripMarkdownFormatting),
    suggestedAgent,
    agentHandoffReason: agentHandoffReason
      ? stripMarkdownFormatting(agentHandoffReason)
      : agentHandoffReason,
    suggestedQuestion: suggestedQuestion
      ? stripMarkdownFormatting(suggestedQuestion)
      : suggestedQuestion,
  }
}

export function buildMissingPartnerResponse(locale: "en" | "ro" = "en"): AgentStructuredResponse {
  if (locale === "ro") {
    return {
      answer:
        "Pot analiza compatibilitatea după ce am datele de naștere ale partenerului. Adaugă data, ora și locul nașterii pentru a compara simbolic cele două hărți.",
      cards: [
        {
          type: "compatibility_score",
          title: "Previzualizare compatibilitate",
          value: null,
          description:
            "Sunt necesare datele de naștere ale partenerului înainte de a citi dinamica relației.",
          items: [
            { label: "Necesar", value: "Data nașterii" },
            { label: "Necesar", value: "Ora nașterii" },
            { label: "Necesar", value: "Locul nașterii" },
          ],
        },
      ],
      followUpQuestions: [
        "Care este data nașterii partenerului?",
        "În ce oraș și țară s-a născut?",
        "Știi ora nașterii?",
      ],
      suggestedAgent: null,
      agentHandoffReason: null,
      suggestedQuestion: null,
    }
  }

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
    suggestedAgent: null,
    agentHandoffReason: null,
    suggestedQuestion: null,
  }
}
