import "server-only"

import OpenAI from "openai"

import { cosmicAiSystemPrompt, getAgentInstruction, getAvailableAgentsCatalog } from "@/lib/agents/prompts"
import { agentResponseJsonSchema, validateAgentResponse } from "@/lib/agents/response-format"
import type { AgentContext, AgentStructuredResponse } from "@/lib/agents/types"

let openaiClient: OpenAI | null = null

function requiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function getOpenAI() {
  if (openaiClient) return openaiClient

  openaiClient = new OpenAI({
    apiKey: requiredEnv("OPENAI_API_KEY"),
  })

  return openaiClient
}

function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-5.4-mini"
}

function useE2EMocks() {
  return process.env.E2E_MOCK_EXTERNALS === "1"
}

function safeContextForPrompt(context: AgentContext) {
  return {
    locale: context.locale,
    agentType: context.agentType,
    userMessage: context.message,
    profile: context.profile,
    inputPolicy: context.inputPolicy,
    inputCompleteness: context.inputCompleteness,
    agentInstruction: getAgentInstruction(context.agentType),
    availableAgents: getAvailableAgentsCatalog(),
    natalSummary: context.natal?.summary,
    dailyHoroscope: context.daily
      ? {
          date: context.daily.date,
          sign: context.daily.sign,
          horoscopeData: context.daily.horoscopeData,
          categories: context.daily.categories,
        }
      : undefined,
    compatibility:
      context.compatibility
        ? {
            mode: context.compatibility.mode,
            personA: context.compatibility.personA?.summary,
            personB: context.compatibility.personB?.summary,
            summary: context.compatibility.summary,
          }
        : undefined,
    localizedAstrology: context.localizedAstrology,
  }
}

export async function generateAgentResponse(
  context: AgentContext
): Promise<{ response: AgentStructuredResponse; model: string; tokensUsed?: number }> {
  if (useE2EMocks()) {
    const suggestsCareerHandoff =
      context.agentType === "love" &&
      /\b(work|career|job|vocat|carier|profes)/i.test(context.message)

    return {
      model: "mock-e2e-model",
      tokensUsed: 42,
      response: {
        answer: `Mocked ${context.agentType} answer for: ${context.message}`,
        cards: [
          {
            type: "reflection",
            title: "E2E Insight",
            description: `Agent ${context.agentType} responded in ${context.locale}.`,
          },
        ],
        followUpQuestions: ["What would you like to explore next?"],
        suggestedAgent: suggestsCareerHandoff ? "career_purpose" : null,
        agentHandoffReason: suggestsCareerHandoff
          ? "Career and purpose questions are Nova's specialty."
          : null,
        suggestedQuestion: suggestsCareerHandoff
          ? "What career path fits my natal chart?"
          : null,
      },
    }
  }

  const model = getOpenAIModel()
  const result = await getOpenAI().responses.create({
    model,
    instructions: cosmicAiSystemPrompt,
    input: JSON.stringify(safeContextForPrompt(context)),
    max_output_tokens: 1400,
    text: {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: "cosmic_ai_agent_response",
        strict: true,
        schema: agentResponseJsonSchema,
      },
    },
    metadata: {
      scope: "cosmic_ai_agent_chat",
      agentType: context.agentType,
    },
  })
  const rawText = result.output_text

  if (!rawText) {
    throw new Error("OpenAI returned an empty response.")
  }

  return {
    response: validateAgentResponse(JSON.parse(rawText)),
    model,
    tokensUsed: result.usage?.total_tokens,
  }
}
