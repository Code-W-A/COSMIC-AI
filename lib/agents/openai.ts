import "server-only"

import OpenAI from "openai"

import { cosmicAiSystemPrompt, getAgentInstruction } from "@/lib/agents/prompts"
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

function safeContextForPrompt(context: AgentContext) {
  return {
    locale: context.locale,
    agentType: context.agentType,
    userMessage: context.message,
    profile: context.profile,
    agentInstruction: getAgentInstruction(context.agentType),
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
  }
}

export async function generateAgentResponse(
  context: AgentContext
): Promise<{ response: AgentStructuredResponse; model: string; tokensUsed?: number }> {
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
