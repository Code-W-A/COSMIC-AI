import { FieldValue } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import {
  buildAgentContext,
  ensureNatalChart,
  getCachedOrGenerateDailyGuidance,
  getProfileSunSign,
  parsePartnerBirthDetails,
  profileToBirthDetails,
  saveCompatibilityData,
} from "@/lib/agents/context"
import { generateAgentResponse } from "@/lib/agents/openai"
import { buildMissingPartnerResponse } from "@/lib/agents/response-format"
import type { AgentStructuredResponse } from "@/lib/agents/types"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getCompatibilityData } from "@/lib/divineapi/compatibility"
import type { CompatibilityData, DailyHoroscopeData } from "@/lib/divineapi/types"
import {
  enforceFreeConversationLimit,
  getConversationsCollection,
  getConversationMessagesCollection,
  getConversationRef,
  getCosmicProfile,
  getReadingsCollection,
  getUserDocument,
} from "@/lib/firebase/firestore"
import { toFirestoreData } from "@/lib/firebase/sanitize"
import { logError, logInfo, logWarn } from "@/lib/logging/logger"
import { isPremiumStatus } from "@/lib/subscription/subscription"
import { incrementUsageForUser, UsageUserMissingError } from "@/lib/subscription/usage"
import { isAgentType } from "@/types/agent"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { DivineApiHttpError } from "@/lib/divineapi/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const FREE_CONVERSATION_LIMIT = 10

function buildReadingPayload({
  agentType,
  message,
  aiResponse,
  usedAstrologyData,
  model,
  tokensUsed,
  isPremium,
}: {
  agentType: string
  message: string
  aiResponse: AgentStructuredResponse
  usedAstrologyData: {
    natal: boolean
    daily: boolean
    compatibility: boolean
  }
  model?: string
  tokensUsed?: number
  isPremium: boolean
}) {
  return {
    agentType,
    question: message,
    answer: aiResponse.answer,
    response: aiResponse.answer,
    cards: aiResponse.cards,
    followUpQuestions: aiResponse.followUpQuestions,
    usedAstrologyData,
    model: model ?? null,
    tokensUsed: tokensUsed ?? null,
    divineApiUsed:
      usedAstrologyData.natal || usedAstrologyData.daily || usedAstrologyData.compatibility,
    isPremium,
    createdAt: FieldValue.serverTimestamp(),
  }
}

export async function POST(request: Request) {
  const locale = getRequestLocale(request)
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return errorResponse("invalid_json", "Request body must be valid JSON.", 400)
  }

  const agentType = body.agentType
  const message = typeof body.message === "string" ? body.message.trim() : ""
  const conversationId =
    typeof body.conversationId === "string" && body.conversationId.trim()
      ? body.conversationId.trim()
      : null

  if (!isAgentType(agentType) || !message) {
    return errorResponse(
      "invalid_agent_request",
      "A valid agent type and message are required.",
      400
    )
  }

  try {
    const usage = await incrementUsageForUser(user.uid)

    if (!usage.allowed) {
      await logWarn("usage", "usage_limit_reached", {
        uid: user.uid,
        monthlyQuestionLimit: usage.monthlyQuestionLimit,
      })

      await logInfo("growth", "paywall_viewed", {
        uid: user.uid,
        source: "chat_limit",
        monthlyQuestionLimit: usage.monthlyQuestionLimit,
      })

      return Response.json(
        {
          success: false,
          error: {
            code: "usage_limit_reached",
            message: "You have reached your monthly free question limit.",
          },
          allowed: false,
          upgradeRequired: true,
          message: "You have reached your monthly free question limit.",
        },
        { status: 403 }
      )
    }

    if (usage.reset) {
      await logInfo("usage", "usage_reset", { uid: user.uid })
    }

    await logInfo("usage", "usage_incremented", {
      uid: user.uid,
      monthlyQuestionCount: usage.monthlyQuestionCount,
      monthlyQuestionLimit: usage.monthlyQuestionLimit,
    })

    const userDocument = await getUserDocument(user.uid)
    const isPremium = isPremiumStatus(userDocument?.subscriptionStatus)
    const profile = await getCosmicProfile(user.uid)

    if (!profile) {
      return errorResponse(
        "cosmic_profile_missing",
        "Please complete your cosmic profile first.",
        400
      )
    }

    const natal = await ensureNatalChart(user.uid, profile, locale)
    let daily: DailyHoroscopeData | undefined
    let compatibility: CompatibilityData | undefined
    let aiResponse: AgentStructuredResponse | null = null
    let model: string | undefined
    let tokensUsed: number | undefined

    if (agentType === "daily_guidance") {
      const sign = natal.summary.sunSign ?? getProfileSunSign(profile)

      if (!sign) {
        return errorResponse(
          "natal_chart_missing_sun_sign",
          "Please generate your natal chart first.",
          400
        )
      }

      daily = (await getCachedOrGenerateDailyGuidance(user.uid, sign, profile, locale)).daily
    }

    if (agentType === "compatibility") {
      const partner = parsePartnerBirthDetails(body.partner)

      if (!partner) {
        aiResponse = buildMissingPartnerResponse()
      } else {
        compatibility = await getCompatibilityData({
          userNatal: natal,
          partnerBirthDetails: partner,
          userBirthDetails: profileToBirthDetails(profile),
          language: locale,
        })
        await saveCompatibilityData({
          uid: user.uid,
          partner,
          compatibility,
        })
      }
    }

    const context = buildAgentContext({
      uid: user.uid,
      locale,
      agentType,
      message,
      profile,
      natal,
      daily,
      compatibility,
    })

    await logInfo("usage", "agent_context_built", {
      uid: user.uid,
      agentType,
      usedAstrologyData: context.usedAstrologyData,
    })

    if (!aiResponse) {
      const generated = await generateAgentResponse(context)
      aiResponse = generated.response
      model = generated.model
      tokensUsed = generated.tokensUsed
    }

    const activeConversationRef = conversationId
      ? getConversationRef(user.uid, conversationId)
      : getConversationsCollection(user.uid).doc()
    const conversationSnapshot = await activeConversationRef.get()

    if (conversationId && !conversationSnapshot.exists) {
      return errorResponse("conversation_not_found", "Conversation was not found.", 404)
    }

    const messagesCollection = getConversationMessagesCollection(user.uid, activeConversationRef.id)
    const userMessageRef = messagesCollection.doc()
    const assistantMessageRef = messagesCollection.doc()
    const now = FieldValue.serverTimestamp()
    const nextMessageCount = (conversationSnapshot.get("messageCount") ?? 0) + 2
    const titleSource = conversationSnapshot.exists
      ? conversationSnapshot.get("title")
      : message
    const nextTitle =
      typeof titleSource === "string" && titleSource.trim()
        ? titleSource.trim().slice(0, 80)
        : message.slice(0, 80)
    const preview = aiResponse.answer.slice(0, 180)
    const chatBatch = activeConversationRef.firestore.batch()

    chatBatch.set(
      activeConversationRef,
      {
        title: nextTitle,
        agentType,
        lastMessagePreview: preview,
        messageCount: nextMessageCount,
        updatedAt: now,
        ...(conversationSnapshot.exists ? {} : { createdAt: now }),
      },
      { merge: true }
    )
    chatBatch.set(
      userMessageRef,
      {
        role: "user",
        content: message,
        agentType,
        createdAt: now,
      },
      { merge: false }
    )
    chatBatch.set(
      assistantMessageRef,
      {
        role: "assistant",
        content: aiResponse.answer,
        agentType,
        createdAt: now,
        model: model ?? null,
        tokensUsed: tokensUsed ?? null,
      },
      { merge: false }
    )
    await chatBatch.commit()

    if (!conversationSnapshot.exists && !isPremium) {
      await enforceFreeConversationLimit(user.uid, FREE_CONVERSATION_LIMIT)
    }

    const readingRef = getReadingsCollection(user.uid).doc()
    await readingRef.set(
      toFirestoreData(buildReadingPayload({
        agentType,
        message,
        aiResponse,
        usedAstrologyData: context.usedAstrologyData,
        model,
        tokensUsed,
        isPremium,
      }))
    )

    await logInfo("usage", "agent_response_saved", {
      uid: user.uid,
      agentType,
      readingId: readingRef.id,
    })

    return successResponse({
      response: aiResponse.answer,
      conversationId: activeConversationRef.id,
      readingId: readingRef.id,
      remaining: usage.remaining,
      data: {
        answer: aiResponse.answer,
        cards: aiResponse.cards,
        followUpQuestions: aiResponse.followUpQuestions,
        usedAstrologyData: context.usedAstrologyData,
        remainingQuestions: usage.remaining,
      },
    })
  } catch (error) {
    if (error instanceof UsageUserMissingError) {
      return errorResponse("user_not_found", "User profile was not found.", 404)
    }

    await logError("usage", "agent_chat_failed", { uid: user.uid, agentType, error })

    if (error instanceof DivineApiHttpError) {
      const code =
        error.status === 401
          ? "divineapi_unauthorized"
          : error.status === 403
            ? "divineapi_forbidden"
            : "divineapi_unavailable"
      const message =
        code === "divineapi_unauthorized"
          ? "Astrology provider authentication failed."
          : code === "divineapi_forbidden"
            ? "Astrology provider access was forbidden."
            : "Astrology provider is unavailable right now."

      return errorResponse(code, message, 502)
    }

    return errorResponse(
      "agent_chat_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to process your message."
        : getErrorMessage(error),
      500
    )
  }
}
