import "server-only"

import OpenAI from "openai"

import { cosmicAiSystemPrompt, getAgentInstruction, getAvailableAgentsCatalog } from "@/lib/agents/prompts"
import { resolveResponseLength, resolveMockAnswerLength, type ResponseLengthProfile } from "@/lib/agents/response-length"
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
  const responseLength = resolveResponseLength({
    agentType: context.agentType,
    message: context.message,
  })

  return {
    locale: context.locale,
    agentType: context.agentType,
    userMessage: context.message,
    profile: context.profile,
    inputPolicy: context.inputPolicy,
    inputCompleteness: context.inputCompleteness,
    agentInstruction: getAgentInstruction(context.agentType),
    availableAgents: getAvailableAgentsCatalog(),
    responseLength,
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
): Promise<{
  response: AgentStructuredResponse
  model: string
  tokensUsed?: number
  responseLengthTier: ResponseLengthProfile["tier"]
}> {
  if (useE2EMocks()) {
    const suggestsCareerHandoff =
      context.agentType === "love" &&
      /\b(work|career|job|vocat|carier|profes)/i.test(context.message)

    const isRo = context.locale === "ro"
    const lengthTier = resolveMockAnswerLength({
      agentType: context.agentType,
      message: context.message,
    })
    const briefAnswer = isRo
      ? `Mocked pe scurt (${context.agentType}): mesajul tău e clar.`
      : `Mocked brief ${context.agentType} answer: your message is clear.`
    const standardAnswer = isRo
      ? `Mocked ${context.agentType} answer for: ${context.message}`
      : `Mocked ${context.agentType} answer for: ${context.message}`
    const deepAnswer = isRo
      ? `Mocked analiză detaliată de la ${context.agentType} pentru: ${context.message}. Pot explora simboluri, context și pași practici fără a repeta aceeași structură de fiecare dată.`
      : `Mocked detailed ${context.agentType} analysis for: ${context.message}. I can explore symbolism, context, and practical next steps without repeating the same structure every time.`

    const baseAnswer =
      lengthTier === "brief" ? briefAnswer : lengthTier === "deep" ? deepAnswer : standardAnswer

    const handoffAnswerSuffix = suggestsCareerHandoff
      ? isRo
        ? " Pentru direcție de carieră, colega mea Nova poate merge mai adânc pe vocație și sensul profesional."
        : " For career direction, my colleague Nova can go deeper on vocation and professional purpose."
      : ""

    const mockCards =
      lengthTier === "brief"
        ? []
        : [
            {
              type: "reflection" as const,
              title: "E2E Insight",
              value: null,
              description: `Agent ${context.agentType} responded in ${context.locale}.`,
              items: [],
            },
          ]

    const mockFollowUps =
      lengthTier === "deep"
        ? ["What would you like to explore next?", "Should we go deeper on one placement?"]
        : lengthTier === "standard"
          ? ["What would you like to explore next?"]
          : []

    return {
      model: "mock-e2e-model",
      tokensUsed: 42,
      responseLengthTier: lengthTier,
      response: {
        answer: `${baseAnswer}${handoffAnswerSuffix}`,
        cards: mockCards,
        followUpQuestions: mockFollowUps,
        suggestedAgent: suggestsCareerHandoff ? "career_purpose" : null,
        agentHandoffReason: suggestsCareerHandoff
          ? isRo
            ? "Nova lucrează zilnic cu vocație, talente și direcție profesională — poate răspunde mai nuanțat la întrebarea ta."
            : "Nova works with vocation, talents, and professional direction every day — she can answer your question with more nuance."
          : null,
        suggestedQuestion: suggestsCareerHandoff
          ? "What career path fits my natal chart?"
          : null,
      },
    }
  }

  const responseLength = resolveResponseLength({
    agentType: context.agentType,
    message: context.message,
  })

  const model = getOpenAIModel()
  const result = await getOpenAI().responses.create({
    model,
    instructions: cosmicAiSystemPrompt,
    input: JSON.stringify(safeContextForPrompt(context)),
    max_output_tokens: responseLength.maxOutputTokens,
    text: {
      verbosity: responseLength.verbosity,
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
      responseLengthTier: responseLength.tier,
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
    responseLengthTier: responseLength.tier,
  }
}
