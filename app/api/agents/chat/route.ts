import { FieldValue } from "firebase-admin/firestore"

import { successResponse } from "@/lib/api/responses"
import {
  buildAgentContext,
  ensureNatalChart,
  getCachedOrGenerateDailyGuidance,
  getProfileSunSign,
  profileToBirthDetails,
  saveCompatibilityData,
} from "@/lib/agents/context"
import { resolveCompatibilityPartnerForChat } from "@/lib/agents/partner-resolution"
import { buildMissingPartnerResponse } from "@/lib/agents/response-format"
import { generateAgentResponse } from "@/lib/agents/openai"
import type { AgentStructuredResponse } from "@/lib/agents/types"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getCompatibilityData } from "@/lib/divineapi/compatibility"
import { translateDivineContent } from "@/lib/divineapi/localization"
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
import { trackAnalyticsEvent, trackFreeLimitReached } from "@/lib/analytics/track-server"
import { chatErrorResponse } from "@/lib/chat/error-response"
import { classifyChatException, createChatError } from "@/lib/chat/errors"
import { CHAT_MAX_USER_MESSAGE_CHARS } from "@/lib/chat/constants"
import { logError, logInfo, logWarn } from "@/lib/logging/logger"
import { isPremiumStatus } from "@/lib/subscription/subscription"
import { incrementUsageForUser, UsageUserMissingError } from "@/lib/subscription/usage"
import { isAgentType } from "@/types/agent"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { DivineApiHttpError } from "@/lib/divineapi/client"
import { getResolvedBirthLocationFromSource, ensureProfileBirthLocationForDivine } from "@/lib/location/profile-location"
import { LocationResolverError, resolveBirthLocation } from "@/lib/location/resolver"
import {
  getAgentInputPolicyId,
  getProfileInputCompleteness,
} from "@/lib/profile/input-policy"

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
  locale,
  astrologySnapshotCanonical,
  astrologySnapshotLocalized,
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
  locale: "ro" | "en"
  astrologySnapshotCanonical?: Record<string, unknown>
  astrologySnapshotLocalized?: {
    locale: "ro"
    segments: Record<string, string>
  }
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
    locale,
    astrologySnapshotCanonical: astrologySnapshotCanonical ?? null,
    astrologySnapshotLocalized: astrologySnapshotLocalized ?? null,
    divineApiUsed:
      usedAstrologyData.natal || usedAstrologyData.daily || usedAstrologyData.compatibility,
    isPremium,
    createdAt: FieldValue.serverTimestamp(),
  }
}

export async function POST(request: Request) {
  const locale = getRequestLocale(request)
  const normalizedLocale: "ro" | "en" = locale === "ro" ? "ro" : "en"
  const user = await requireUser(request)

  if (isAuthResponse(user)) {
    return chatErrorResponse("AUTH_REQUIRED", normalizedLocale, 401)
  }

  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return chatErrorResponse("UNKNOWN_ERROR", normalizedLocale, 400)
  }

  const agentType = body.agentType
  const rawMessage = typeof body.message === "string" ? body.message : ""
  const message = rawMessage.trim()
  const conversationId =
    typeof body.conversationId === "string" && body.conversationId.trim()
      ? body.conversationId.trim()
      : null

  if (!message) {
    return chatErrorResponse("EMPTY_MESSAGE", normalizedLocale, 400)
  }

  if (message.length > CHAT_MAX_USER_MESSAGE_CHARS) {
    return chatErrorResponse("MESSAGE_TOO_LONG", normalizedLocale, 400)
  }

  if (!isAgentType(agentType)) {
    return chatErrorResponse("UNKNOWN_ERROR", normalizedLocale, 400)
  }

  await trackAnalyticsEvent("chat_message_sent", {
    uid: user.uid,
    locale: normalizedLocale,
    source: "chat",
    agentType,
  })

  try {
    const userDocument = await getUserDocument(user.uid)
    const isPremium = isPremiumStatus(userDocument?.subscriptionStatus)
    const profile = await getCosmicProfile(user.uid)

    if (!profile) {
      return chatErrorResponse("ONBOARDING_REQUIRED", normalizedLocale, 400)
    }

    const policyId = getAgentInputPolicyId(agentType)
    const profileCompleteness = getProfileInputCompleteness(profile, policyId)
    if (!profileCompleteness.isComplete) {
      return chatErrorResponse("ONBOARDING_REQUIRED", normalizedLocale, 400)
    }

    const preResolvedPartner =
      agentType === "compatibility"
        ? await resolveCompatibilityPartnerForChat(user.uid, body)
        : null

    if (agentType === "compatibility" && !preResolvedPartner) {
      const aiResponse = buildMissingPartnerResponse(normalizedLocale)

      return successResponse({
        response: aiResponse.answer,
        conversationId,
        data: {
          answer: aiResponse.answer,
          cards: aiResponse.cards,
          followUpQuestions: aiResponse.followUpQuestions,
          partnerActionRequired: true,
        },
      })
    }

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

      await trackFreeLimitReached({
        uid: user.uid,
        locale: normalizedLocale,
        source: "chat",
        monthlyQuestionLimit: usage.monthlyQuestionLimit,
      })

      return chatErrorResponse("USAGE_LIMIT_REACHED", normalizedLocale, 403)
    }

    if (usage.reset) {
      await logInfo("usage", "usage_reset", { uid: user.uid })
    }

    await logInfo("usage", "usage_incremented", {
      uid: user.uid,
      monthlyQuestionCount: usage.monthlyQuestionCount,
      monthlyQuestionLimit: usage.monthlyQuestionLimit,
    })

    const profileWithLocation = await ensureProfileBirthLocationForDivine({
      uid: user.uid,
      profile,
      locale,
      source: "api.agents.chat",
    })

    const natal = await ensureNatalChart(user.uid, profileWithLocation, locale)
    let daily: DailyHoroscopeData | undefined
    let compatibility: CompatibilityData | undefined
    let aiResponse: AgentStructuredResponse | null = null
    let model: string | undefined
    let tokensUsed: number | undefined

    if (agentType === "daily_guidance") {
      const sign = natal.summary.sunSign ?? getProfileSunSign(profile)

      if (!sign) {
        return chatErrorResponse("ONBOARDING_REQUIRED", normalizedLocale, 400)
      }

      daily = (
        await getCachedOrGenerateDailyGuidance(user.uid, sign, profileWithLocation, locale)
      ).daily
    }

    if (agentType === "compatibility" && preResolvedPartner) {
      const partner = preResolvedPartner.partner
      const partnerBody = preResolvedPartner.partnerBody
      const providedResolvedLocation = getResolvedBirthLocationFromSource(partnerBody)
      const resolvedLocation =
        providedResolvedLocation ??
        (await resolveBirthLocation({
          placeId:
            typeof partnerBody.birthPlacePlaceId === "string"
              ? partnerBody.birthPlacePlaceId
              : undefined,
          birthPlace: partner.birthPlace,
          birthDate: partner.birthDate,
          birthTime: partner.birthTime,
          locale,
          uid: user.uid,
          source: "api.agents.chat.compatibility",
        }))

      const resolvedPartner = {
        ...partner,
        birthPlace: resolvedLocation.birthPlace,
        birthPlacePlaceId: resolvedLocation.placeId,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
        timezoneIana: resolvedLocation.timezoneIana,
        timezoneOffsetAtBirth: resolvedLocation.timezoneOffsetAtBirth,
        timezone: resolvedLocation.timezoneOffsetAtBirth,
      }

      compatibility = await getCompatibilityData({
        userNatal: natal,
        partnerBirthDetails: resolvedPartner,
        userBirthDetails: profileToBirthDetails(profileWithLocation),
        language: locale,
      })
      await saveCompatibilityData({
        uid: user.uid,
        partner: resolvedPartner,
        compatibility,
      })
    }

    const localizedContent = await translateDivineContent({
      uid: user.uid,
      locale: normalizedLocale,
      natal,
      daily,
      compatibility,
    })

    const context = buildAgentContext({
      uid: user.uid,
      locale,
      agentType,
      message,
      profile,
      natal,
      daily,
      compatibility,
      astrologySnapshotCanonical: localizedContent.astrologySnapshotCanonical,
      localizedAstrology: localizedContent.astrologySnapshotLocalized,
    })

    await logInfo("usage", "agent_context_built", {
      uid: user.uid,
      agentType,
      usedAstrologyData: context.usedAstrologyData,
    })

    if (!aiResponse) {
      try {
        const generated = await generateAgentResponse(context)
        aiResponse = generated.response
        model = generated.model
        tokensUsed = generated.tokensUsed
        await logInfo("usage", "agent_response_length", {
          uid: user.uid,
          agentType,
          responseLengthTier: generated.responseLengthTier,
          tokensUsed: generated.tokensUsed ?? null,
        })
      } catch (error) {
        await logError("chat.openai", "agent_response_generation_failed", {
          uid: user.uid,
          agentType,
          error,
        })
        const code = classifyChatException(error)
        return chatErrorResponse(code, normalizedLocale, code === "UNKNOWN_ERROR" ? 500 : 503)
      }
    }

    const activeConversationRef = conversationId
      ? getConversationRef(user.uid, conversationId)
      : getConversationsCollection(user.uid).doc()
    const readingRef = getReadingsCollection(user.uid).doc()
    let persisted = true
    let persistenceWarning: ReturnType<typeof createChatError> | undefined

    try {
      const conversationSnapshot = await activeConversationRef.get()
      if (conversationId && !conversationSnapshot.exists) {
        throw new Error("Conversation not found during chat persistence.")
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
      chatBatch.set(userMessageRef, { role: "user", content: message, agentType, createdAt: now })
      chatBatch.set(assistantMessageRef, {
        role: "assistant",
        content: aiResponse.answer,
        agentType,
        createdAt: now,
        model: model ?? null,
        tokensUsed: tokensUsed ?? null,
      })
      await chatBatch.commit()

      if (!conversationSnapshot.exists && !isPremium) {
        await enforceFreeConversationLimit(user.uid, FREE_CONVERSATION_LIMIT)
      }

      await readingRef.set(
        toFirestoreData(buildReadingPayload({
          agentType,
          message,
          aiResponse,
          usedAstrologyData: context.usedAstrologyData,
          model,
          tokensUsed,
          isPremium,
          locale: normalizedLocale,
          astrologySnapshotCanonical: localizedContent.astrologySnapshotCanonical,
          astrologySnapshotLocalized: localizedContent.astrologySnapshotLocalized,
        }))
      )

      await logInfo("usage", "agent_response_saved", {
        uid: user.uid,
        agentType,
        readingId: readingRef.id,
      })
    } catch (error) {
      persisted = false
      const warningCode = classifyChatException(error, "persistence")
      await logError("chat.persistence", "agent_response_save_failed", {
        uid: user.uid,
        agentType,
        conversationId: activeConversationRef.id,
        error,
      })
      if (warningCode !== "FIREBASE_SAVE_ERROR") {
        throw error
      }
      persistenceWarning = createChatError(warningCode, normalizedLocale)
    }

    return successResponse({
      response: aiResponse.answer,
      conversationId: activeConversationRef.id,
      readingId: persisted ? readingRef.id : null,
      persisted,
      ...(persistenceWarning ? { warning: persistenceWarning } : {}),
      remaining: usage.remaining,
      data: {
        answer: aiResponse.answer,
        cards: aiResponse.cards,
        followUpQuestions: aiResponse.followUpQuestions,
        suggestedAgent: aiResponse.suggestedAgent,
        agentHandoffReason: aiResponse.agentHandoffReason,
        suggestedQuestion: aiResponse.suggestedQuestion,
        usedAstrologyData: context.usedAstrologyData,
        remainingQuestions: usage.remaining,
      },
    })
  } catch (error) {
    if (error instanceof UsageUserMissingError) {
      return chatErrorResponse("ONBOARDING_REQUIRED", normalizedLocale, 404)
    }

    await logError("usage", "agent_chat_failed", { uid: user.uid, agentType, error })

    if (error instanceof LocationResolverError) {
      return chatErrorResponse(
        error.code === "birth_location_unresolved" ? "ONBOARDING_REQUIRED" : "UNKNOWN_ERROR",
        normalizedLocale,
        error.code === "birth_location_unresolved" ? 400 : 502
      )
    }

    if (error instanceof DivineApiHttpError) {
      return chatErrorResponse("UNKNOWN_ERROR", normalizedLocale, 502)
    }

    const code = classifyChatException(error)
    return chatErrorResponse(code, normalizedLocale, code === "UNKNOWN_ERROR" ? 500 : 503)
  }
}
