"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Sparkles,
  Send,
  Menu,
  X,
  Plus,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  MessageSquare,
} from "lucide-react"

import { AgentAvatar } from "@/components/agents/agent-avatar"
import { ChatErrorMessage } from "@/components/chat/chat-error-message"
import { AgentThinkingIndicator } from "@/components/chat/agent-thinking-indicator"
import { ChatMessageCopyButton } from "@/components/chat/chat-message-copy-button"
import { AuthGuard } from "@/components/auth/auth-guard"
import { AppLogo } from "@/components/branding/app-logo"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiClientError, apiFetch } from "@/lib/api/client"
import { agentAvatarCatalog } from "@/lib/agents/avatar-catalog"
import { asksForChartDetails, getChartAccountPath } from "@/lib/chat/chart-intent"
import { buildHandoffCtas, type MessageCta } from "@/lib/chat/agent-handoff"
import { CHAT_MAX_USER_MESSAGE_CHARS } from "@/lib/chat/constants"
import {
  CHAT_ERROR_DEFINITIONS,
  isChatErrorCode,
  type ChatApiError,
  type ChatErrorCode,
} from "@/lib/chat/errors"
import { stripMarkdownFormatting } from "@/lib/chat/plain-text"
import { getChatConversationPath, getNewChatPath } from "@/lib/chat/paths"
import { logout } from "@/lib/firebase/auth"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"
import type { AgentType } from "@/types/agent"
import type { SubscriptionStatusResponse } from "@/types/subscription"

const SIDEBAR_STORAGE_KEY = "cosmic.chat.sidebar.expanded"
const SIDEBAR_EXPANDED_WIDTH = 320
const SIDEBAR_COLLAPSED_WIDTH = 76

const agents = [
  { id: "birth_chart", color: "#6D4BFF" },
  { id: "love", color: "#D66BFF" },
  { id: "compatibility", color: "#8B5CFF" },
  { id: "daily_guidance", color: "#FFB86D" },
  { id: "career_purpose", color: "#4BC8FF" },
  { id: "spiritual_reflection", color: "#B69CFF" },
] satisfies { id: AgentType; color: string }[]

const suggestedPrompts = [
  "What does my chart say about love?",
  "Why do I attract unavailable partners?",
  "What should I focus on today?",
  "What career path fits me?",
  "Are we compatible?",
]

function buildPartnerCompatibilityAccountPath(
  localizedPath: (path: string) => string,
  returnTo: string
) {
  const params = new URLSearchParams({
    tab: "compatibility",
    returnTo,
  })
  return localizedPath(`/account?${params.toString()}`)
}

type MessageDeliveryStatus = "sending" | "sent" | "streaming" | "completed" | "failed"

interface ChatRetryRequest {
  content: string
  agentType: AgentType
  conversationId: string | null
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  agent?: string
  agentType?: AgentType
  handoffReason?: string
  ctas?: MessageCta[]
  deliveryStatus?: MessageDeliveryStatus
  retryRequest?: ChatRetryRequest
  pendingStartedAt?: number
  error?: ChatApiError
  warningCode?: "FIREBASE_SAVE_ERROR"
}

interface ConversationSummary {
  id: string
  title: string
  lastMessagePreview: string
  updatedAt: string | null
  agentType: AgentType
  messageCount: number
}

function getAgentLabel(agentType: AgentType, isRo: boolean) {
  if (isRo) {
    const roMap: Record<AgentType, string> = {
      birth_chart: "Hartă natală",
      love: "Iubire",
      compatibility: "Compatibilitate",
      daily_guidance: "Ghidaj zilnic",
      career_purpose: "Carieră",
      spiritual_reflection: "Spiritual",
    }
    return roMap[agentType]
  }

  const enMap: Record<AgentType, string> = {
    birth_chart: "Birth Chart",
    love: "Love",
    compatibility: "Compatibility",
    daily_guidance: "Daily Guidance",
    career_purpose: "Career",
    spiritual_reflection: "Spiritual",
  }
  return enMap[agentType]
}

function getAgentPersonaName(agentType: AgentType) {
  return agentAvatarCatalog[agentType].personaName
}

function getAgentSidebarLabel(agentType: AgentType, isRo: boolean) {
  return `${getAgentPersonaName(agentType)} - ${getAgentLabel(agentType, isRo)}`
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function ConversationsSkeletonList() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-border bg-[rgba(255,255,255,0.02)] px-3 py-2"
        >
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-4/5" />
          <Skeleton className="mt-2 h-2.5 w-1/3" />
        </div>
      ))}
    </div>
  )
}

function MessagesSkeletonList() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((item) => (
        <div key={item} className={`flex ${item % 2 === 0 ? "justify-start" : "justify-end"}`}>
          <div
            className={`max-w-[88%] rounded-2xl border px-5 py-4 sm:max-w-[75%] ${
              item % 2 === 0
                ? "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)]"
                : "border-[rgba(109,75,255,0.3)] bg-[rgba(109,75,255,0.2)]"
            }`}
          >
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="mt-2 h-3.5 w-56" />
            <Skeleton className="mt-2 h-3.5 w-36" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChatPageClient({
  conversationIdFromUrl = null,
}: {
  conversationIdFromUrl?: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const localizedPath = useLocalizedPath()
  const { locale, t } = useTranslations()
  const isRo = locale === "ro"
  const chatReturnTo = useMemo(() => {
    const query = searchParams.toString()
    return query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])

  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [agentsAccordionOpen, setAgentsAccordionOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [activeAgent, setActiveAgent] = useState<AgentType>("love")
  const [draftConversationId, setDraftConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [nextConversationsCursor, setNextConversationsCursor] = useState<string | null>(null)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [composerError, setComposerError] = useState("")
  const [isGeneratingDivineData, setIsGeneratingDivineData] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [natalReady, setNatalReady] = useState<boolean | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sendAbortRef = useRef<AbortController | null>(null)
  const sendGenerationRef = useRef(0)
  const skipNextLoadRef = useRef<string | null>(null)

  const activeConversationId = conversationIdFromUrl ?? draftConversationId

  const prompts = isRo
    ? [
        "Ce spune harta mea despre iubire?",
        "De ce atrag parteneri indisponibili emoțional?",
        "Pe ce să mă concentrez azi?",
        "Ce carieră mi se potrivește?",
        "Suntem compatibili?",
      ]
    : suggestedPrompts

  const activeAgentLabel = getAgentLabel(activeAgent, isRo)
  const activeAgentPersonaName = getAgentPersonaName(activeAgent)
  const isAwaitingResponse = messages.some((message) => message.deliveryStatus === "streaming")
  const isNewChatState = !loadingMessages && messages.length === 0 && !isAwaitingResponse

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored === "0") setSidebarExpanded(false)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const agentParam = params.get("agent")
    const validAgents = agents.map((agent) => agent.id)
    if (agentParam && validAgents.includes(agentParam as AgentType)) {
      setActiveAgent(agentParam as AgentType)
    }
  }, [])

  useEffect(() => {
    return () => {
      sendAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarExpanded ? "1" : "0")
  }, [sidebarExpanded])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isAwaitingResponse, scrollToBottom])

  async function fetchConversations(cursor?: string | null) {
    const search = new URLSearchParams({ limit: "20" })
    if (cursor) search.set("cursor", cursor)
    return apiFetch<{ success: true; conversations: ConversationSummary[]; nextCursor: string | null }>(
      `/api/chat/conversations?${search.toString()}`
    )
  }

  useEffect(() => {
    let cancelled = false
    setLoadingConversations(true)

    Promise.all([
      fetchConversations(),
      apiFetch<{ success: true } & SubscriptionStatusResponse>("/api/subscription/status").catch(() => null),
      apiFetch<{ success: true; profile: unknown | null; profileComplete?: boolean; natalReady?: boolean }>("/api/user/profile").catch(() => null),
    ])
      .then(([conversationPayload, subscriptionPayload, profilePayload]) => {
        if (cancelled) return
        if (!profilePayload || profilePayload.profileComplete !== true) {
          router.replace(localizedPath("/onboarding"))
          return
        }
        if (profilePayload.natalReady !== true) {
          router.replace(localizedPath("/onboarding?phase=divine"))
          return
        }
        if (profilePayload) {
          setNatalReady(profilePayload.natalReady ?? false)
        }
        setConversations(conversationPayload.conversations ?? [])
        setNextConversationsCursor(conversationPayload.nextCursor ?? null)
        if (subscriptionPayload) {
          setIsPremium(Boolean(subscriptionPayload.isPremium))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConversations([])
          setNextConversationsCursor(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingConversations(false)
      })

    return () => {
      cancelled = true
    }
  }, [localizedPath, router])

  useEffect(() => {
    if (loadingConversations || loadingMessages || !isNewChatState) return
    inputRef.current?.focus()
  }, [loadingConversations, loadingMessages, isNewChatState])

  useEffect(() => {
    if (conversationIdFromUrl) return
    setDraftConversationId(null)
    setMessages([])
  }, [conversationIdFromUrl])

  useEffect(() => {
    if (!conversationIdFromUrl) return
    if (skipNextLoadRef.current === conversationIdFromUrl) {
      skipNextLoadRef.current = null
      return
    }

    let cancelled = false
    setLoadingMessages(true)

    apiFetch<{
      success: true
      messages: Array<{ id: string; role: "user" | "assistant"; content: string; agentType: AgentType }>
    }>(`/api/chat/conversations/${conversationIdFromUrl}/messages?limit=200`)
      .then((payload) => {
        if (cancelled) return

        const hydrated = (payload.messages ?? []).map((item) => ({
          id: item.id,
          role: item.role,
          content: stripMarkdownFormatting(item.content),
          agentType: item.agentType,
          deliveryStatus: "completed" as const,
          agent:
            item.role === "assistant"
              ? `${getAgentPersonaName(item.agentType)} · ${getAgentLabel(item.agentType, isRo)}`
              : undefined,
        }))

        setMessages(hydrated)
        const lastAssistant = [...hydrated].reverse().find((msg) => msg.role === "assistant")
        if (lastAssistant?.agentType) {
          setActiveAgent(lastAssistant.agentType)
        }
        setMobileSidebarOpen(false)
      })
      .catch(() => {
        if (!cancelled) {
          router.replace(localizedPath(getNewChatPath()))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false)
      })

    return () => {
      cancelled = true
    }
  }, [conversationIdFromUrl, isRo, localizedPath, router])

  async function openConversation(conversationId: string) {
    setMobileSidebarOpen(false)
    router.push(localizedPath(getChatConversationPath(conversationId)))
  }

  function startNewConversation() {
    setMobileSidebarOpen(false)
    router.push(localizedPath(getNewChatPath()))
  }

  async function refreshConversations() {
    const payload = await fetchConversations()
    setConversations(payload.conversations ?? [])
    setNextConversationsCursor(payload.nextCursor ?? null)
  }

  function formatHandoffContinueLabel(persona: string, specialty: string) {
    return t("chat.agentHandoff.continueWith")
      .replace("{persona}", persona)
      .replace("{specialty}", specialty)
  }

  function handleSwitchAgent(targetAgent: AgentType, prefillQuestion?: string) {
    setActiveAgent(targetAgent)
    setAgentsAccordionOpen(true)
    if (prefillQuestion) {
      setInput(prefillQuestion)
    }
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  async function loadMoreConversations() {
    if (!nextConversationsCursor || loadingMoreConversations) return

    setLoadingMoreConversations(true)
    try {
      const payload = await fetchConversations(nextConversationsCursor)
      setConversations((prev) => [...prev, ...(payload.conversations ?? [])])
      setNextConversationsCursor(payload.nextCursor ?? null)
    } finally {
      setLoadingMoreConversations(false)
    }
  }

  function buildRetryCta(): MessageCta {
    return {
      label: t("chat.waiting.retry"),
      action: "retry_send",
      variant: "primary",
    }
  }

  function validateSendContent(content: string) {
    if (!content.trim()) return t("chat.error.EMPTY_MESSAGE")
    if (content.length > CHAT_MAX_USER_MESSAGE_CHARS) return t("chat.error.MESSAGE_TOO_LONG")
    return null
  }

  function handleRetrySend(request: ChatRetryRequest, failedAssistantId: string) {
    void handleSend(undefined, { retryRequest: request, assistantId: failedAssistantId })
  }

  async function handleSend(
    text?: string,
    options?: { retryRequest?: ChatRetryRequest; assistantId?: string }
  ) {
    const retryRequest = options?.retryRequest
    const content = (retryRequest?.content ?? text ?? input).trim()
    const validationError = validateSendContent(content)

    if (validationError) {
      setComposerError(validationError)
      return
    }

    if (isAwaitingResponse) return

    setComposerError("")

    const requestAgent = retryRequest?.agentType ?? activeAgent
    const requestConversationId = retryRequest?.conversationId ?? activeConversationId
    const requestSnapshot: ChatRetryRequest = {
      content,
      agentType: requestAgent,
      conversationId: requestConversationId,
    }
    const requestAgentLabel = getAgentLabel(requestAgent, isRo)
    const requestAgentPersonaName = getAgentPersonaName(requestAgent)
    const shouldOfferChartCta = asksForChartDetails(content, requestAgent)
    const pendingId = options?.assistantId ?? `local-assistant-pending-${Date.now()}`
    const pendingStartedAt = Date.now()
    const isRetry = Boolean(retryRequest && options?.assistantId)

    const userMsg: Message = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content,
      agentType: requestAgent,
      deliveryStatus: "sending",
    }

    const pendingMsg: Message = {
      id: pendingId,
      role: "assistant",
      content: "",
      agent: `${requestAgentPersonaName} · ${requestAgentLabel}`,
      agentType: requestAgent,
      deliveryStatus: "streaming",
      retryRequest: requestSnapshot,
      pendingStartedAt,
    }

    sendAbortRef.current?.abort()
    const controller = new AbortController()
    sendAbortRef.current = controller
    const generation = ++sendGenerationRef.current

    setMessages((prev) => {
      if (isRetry) {
        return prev.map((message) => (message.id === pendingId ? pendingMsg : message))
      }
      return [...prev, userMsg, pendingMsg]
    })

    if (!isRetry) {
      setInput("")
      queueMicrotask(() => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === userMsg.id ? { ...message, deliveryStatus: "sent" } : message
          )
        )
      })
    }

    try {
      const payload = await apiFetch<{
        success: true
        response?: string
        conversationId: string
        persisted?: boolean
        warning?: ChatApiError
        data?: {
          answer?: string
          suggestedAgent?: AgentType | null
          agentHandoffReason?: string | null
          suggestedQuestion?: string | null
          partnerActionRequired?: boolean
        }
      }>("/api/agents/chat", {
        method: "POST",
        signal: controller.signal,
        body: {
          agentType: requestAgent,
          message: content,
          conversationId: requestConversationId,
        },
      })

      if (generation !== sendGenerationRef.current) return

      const handoffCtas = buildHandoffCtas(
        {
          suggestedAgent: payload.data?.suggestedAgent,
          agentHandoffReason: payload.data?.agentHandoffReason,
          suggestedQuestion: payload.data?.suggestedQuestion,
        },
        requestAgent,
        formatHandoffContinueLabel,
        (agentType) => getAgentLabel(agentType, isRo)
      )

      const chartCtas: MessageCta[] = shouldOfferChartCta
        ? [
            {
              label: t("chat.sidebar.profileAndReadings"),
              href: localizedPath(getChartAccountPath(requestAgent)),
              variant: "primary",
            },
          ]
        : []

      const partnerActionRequired = payload.data?.partnerActionRequired === true
      const partnerCtas: MessageCta[] = partnerActionRequired
        ? [
            {
              label: t("chat.partner.addPartnerDetails"),
              href: buildPartnerCompatibilityAccountPath(localizedPath, chatReturnTo),
              variant: "primary",
            },
          ]
        : []

      const completedMsg: Message = {
        id: pendingId,
        role: "assistant",
        content: partnerActionRequired
          ? t("chat.partner.incompletePrompt")
          : stripMarkdownFormatting(
              payload.data?.answer ??
                payload.response ??
                (isRo ? "Nu am putut genera un răspuns." : "I could not generate a response.")
            ),
        agent: `${requestAgentPersonaName} · ${requestAgentLabel}`,
        agentType: requestAgent,
        deliveryStatus: "completed",
        retryRequest: requestSnapshot,
        warningCode:
          payload.persisted === false && payload.warning?.code === "FIREBASE_SAVE_ERROR"
            ? "FIREBASE_SAVE_ERROR"
            : undefined,
        handoffReason: payload.data?.agentHandoffReason ?? undefined,
        ctas:
          [...handoffCtas, ...chartCtas, ...partnerCtas].length > 0
            ? [...handoffCtas, ...chartCtas, ...partnerCtas]
            : undefined,
      }

      setMessages((prev) => prev.map((message) => (message.id === pendingId ? completedMsg : message)))
      setDraftConversationId(payload.conversationId)
      if (!conversationIdFromUrl) {
        skipNextLoadRef.current = payload.conversationId
        router.replace(localizedPath(getChatConversationPath(payload.conversationId)))
      }
      if (payload.persisted !== false) {
        await refreshConversations().catch(() => undefined)
      }
    } catch (chatError) {
      if (isAbortError(chatError)) {
        return
      }

      if (generation !== sendGenerationRef.current) return

      const errorCode: ChatErrorCode =
        chatError instanceof ApiClientError && isChatErrorCode(chatError.code)
          ? chatError.code
          : chatError instanceof ApiClientError
            ? "UNKNOWN_ERROR"
            : "NETWORK_ERROR"
      const definition = CHAT_ERROR_DEFINITIONS[errorCode]
      const error: ChatApiError = {
        code: errorCode,
        message: definition.messages[locale],
        retryable:
          chatError instanceof ApiClientError && chatError.retryable !== null
            ? chatError.retryable
            : definition.retryable,
        action:
          chatError instanceof ApiClientError && chatError.action !== null
            ? chatError.action
            : definition.action,
      }

      const errorMsg: Message = {
        id: pendingId,
        role: "assistant",
        content: "",
        agent: `${requestAgentPersonaName} · ${requestAgentLabel}`,
        agentType: requestAgent,
        deliveryStatus: "failed",
        retryRequest: requestSnapshot,
        error,
      }

      setMessages((prev) => prev.map((message) => (message.id === pendingId ? errorMsg : message)))
    } finally {
      if (generation === sendGenerationRef.current) {
        sendAbortRef.current = null
      }
    }
  }

  function handleStopSend() {
    sendGenerationRef.current += 1
    sendAbortRef.current?.abort()
    sendAbortRef.current = null

    setMessages((prev) =>
      prev.map((message) =>
        message.deliveryStatus === "streaming"
          ? {
              ...message,
              content: t("chat.waiting.stopped"),
              deliveryStatus: "failed",
              error: undefined,
              ctas: [buildRetryCta()],
            }
          : message
      )
    )
  }

  async function handleGenerateDivineData() {
    if (isGeneratingDivineData) return

    setIsGeneratingDivineData(true)
    try {
      const payload = await apiFetch<{
        success: true
        generated: { natal: boolean; daily: boolean }
        cached: { natal: boolean; daily: boolean }
      }>("/api/astrology/generate-all", {
        method: "POST",
        body: { source: "chat_cta" },
      })

      const natalStatus = payload.generated.natal ? t("chat.divine.generateStatus.natalGenerated") : t("chat.divine.generateStatus.natalCached")
      const dailyStatus = payload.generated.daily ? t("chat.divine.generateStatus.dailyGenerated") : t("chat.divine.generateStatus.dailyCached")

      setMessages((prev) => [
        ...prev,
        {
          id: `local-divine-ready-${Date.now()}`,
          role: "assistant",
          content: `${t("chat.divine.generateSuccess")}\n\n• ${natalStatus}\n• ${dailyStatus}\n\n${t("chat.divine.compatibilityHint")}`,
          agent: `${activeAgentPersonaName} · ${activeAgentLabel}`,
          agentType: activeAgent,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-divine-failed-${Date.now()}`,
          role: "assistant",
          content: t("chat.divine.generateFailed"),
          agent: `${activeAgentPersonaName} · ${activeAgentLabel}`,
          agentType: activeAgent,
          ctas: [
            {
              label: t("chat.divine.goToOnboarding"),
              href: localizedPath("/onboarding"),
              variant: "secondary",
            },
          ],
        },
      ])
    } finally {
      setIsGeneratingDivineData(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  function renderComposer() {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <div className="flex items-end gap-3 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] px-4 py-3">
          <textarea
            ref={inputRef}
            data-testid="chat-input"
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              if (composerError) setComposerError("")
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.input.placeholder").replace(
              "{agentName}",
              activeAgentPersonaName
            )}
            rows={1}
            className="max-h-36 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
            onInput={(event) => {
              const element = event.currentTarget
              element.style.height = "auto"
              element.style.height = `${Math.min(element.scrollHeight, 144)}px`
            }}
          />
          <button
            type="button"
            data-testid="chat-send-button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isAwaitingResponse}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] text-foreground disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {composerError ? (
          <p
            data-testid="chat-composer-error"
            className="mt-2 px-1 text-xs text-[#FFB4B4]"
            role="alert"
          >
            {composerError}
          </p>
        ) : null}
      </div>
    )
  }

  function renderSuggestedPrompts() {
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            data-testid="chat-suggested-prompt"
            onClick={() => void handleSend(prompt)}
            disabled={isAwaitingResponse}
            className="rounded-full border border-border bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    )
  }

  const conversationLimitLabel = isPremium
    ? isRo
      ? "Premium · istoric nelimitat"
      : "Premium · unlimited history"
    : isRo
      ? "Free · max 10 conversații"
      : "Free · max 10 conversations"

  const sidebarExpandedContent = (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
        <Link href={localizedPath("/")} className="flex items-center gap-2">
          <AppLogo size={32} className="ring-1 ring-white/20" />
          <span className="text-sm font-semibold text-foreground">AstroAI 24/7</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <button
            type="button"
            onClick={() => setSidebarExpanded(false)}
            className="rounded-md border border-border bg-[rgba(255,255,255,0.04)] p-1.5 text-muted-foreground hover:text-foreground"
            aria-label={isRo ? "Retrage sidebar" : "Collapse sidebar"}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-4 pt-3">
          <button
            type="button"
            data-testid="chat-agents-toggle"
            onClick={() => setAgentsAccordionOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-[rgba(255,255,255,0.03)] px-3 py-2 text-left text-sm text-foreground"
          >
            <span>{isRo ? "Agenți AI" : "AI Agents"}</span>
            {agentsAccordionOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <AnimatePresence initial={false}>
            {agentsAccordionOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-2">
                  {agents.map((agent) => {
                    const isActive = activeAgent === agent.id
                    return (
                      <button
                        key={agent.id}
                        data-testid={`chat-agent-option-${agent.id}`}
                        onClick={() => setActiveAgent(agent.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                          isActive
                            ? "border border-[rgba(109,75,255,0.35)] bg-[rgba(109,75,255,0.14)] text-foreground"
                            : "border border-transparent text-muted-foreground hover:border-border hover:bg-[rgba(255,255,255,0.04)] hover:text-foreground"
                        }`}
                      >
                        <AgentAvatar agentType={agent.id} size="sm" showRing={isActive} priority={false} />
                        <span>{getAgentSidebarLabel(agent.id, isRo)}</span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mx-4 mt-3 border-t border-border" />

        <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{isRo ? "Istoric" : "History"}</p>
            <button
              type="button"
              onClick={startNewConversation}
              data-testid="chat-new-button"
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-[rgba(255,255,255,0.06)]"
            >
              <Plus className="h-3 w-3" />
              {isRo ? "Nou" : "New"}
            </button>
          </div>

          <p className="mb-2 text-[11px] text-muted-foreground">{conversationLimitLabel}</p>

          <div className="cosmic-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto">
            {loadingConversations ? (
              <ConversationsSkeletonList />
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {isRo ? "Nicio conversație salvată încă." : "No saved conversations yet."}
              </p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  data-testid="chat-history-item"
                  onClick={() => void openConversation(conversation.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    activeConversationId === conversation.id
                      ? "border-[rgba(109,75,255,0.35)] bg-[rgba(109,75,255,0.13)]"
                      : "border-border bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)]"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-foreground">{conversation.title}</p>
                </button>
              ))
            )}
          </div>

          {nextConversationsCursor && (
            <button
              type="button"
              onClick={() => void loadMoreConversations()}
              data-testid="chat-history-load-more"
              disabled={loadingMoreConversations}
              className="mt-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-60"
            >
              {loadingMoreConversations ? (isRo ? "Se încarcă..." : "Loading...") : isRo ? "Încarcă mai mult" : "Load more"}
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-border px-4 py-4">
        <Link
          href={localizedPath("/account")}
          className="mb-2 flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-[rgba(255,255,255,0.05)]"
        >
          <User className="h-4 w-4" />
          {t("chat.sidebar.profileAndReadings")}
        </Link>
        <button
          type="button"
          data-testid="chat-logout-button"
          onClick={async () => {
            await logout()
            router.push(localizedPath("/"))
          }}
          className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-foreground hover:bg-[rgba(255,255,255,0.05)]"
        >
          <LogOut className="h-4 w-4" />
          {isRo ? "Deconectare" : "Log out"}
        </button>
      </div>
    </>
  )

  const sidebarCollapsedRail = (
    <div className="flex h-full w-full flex-col justify-between py-4">
      <div className="flex w-full flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setSidebarExpanded(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-[rgba(255,255,255,0.04)] text-foreground"
          aria-label={isRo ? "Extinde sidebar" : "Expand sidebar"}
        >
          <Menu className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setAgentsAccordionOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-[rgba(255,255,255,0.03)] text-muted-foreground hover:text-foreground"
          aria-label={isRo ? "Agenți" : "Agents"}
        >
          <Sparkles className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setSidebarExpanded(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-[rgba(255,255,255,0.03)] text-muted-foreground hover:text-foreground"
          aria-label={isRo ? "Istoric" : "History"}
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>

      <div className="flex w-full flex-col items-center gap-2">
        <Link
          href={localizedPath("/account")}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-[rgba(255,255,255,0.03)] text-muted-foreground hover:text-foreground"
          aria-label={t("chat.sidebar.profileAndReadings")}
        >
          <User className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={async () => {
            await logout()
            router.push(localizedPath("/"))
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-[rgba(255,255,255,0.03)] text-muted-foreground hover:text-foreground"
          aria-label={isRo ? "Deconectare" : "Log out"}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  const sidebar = (
    <motion.aside
      layout
      transition={{ duration: 0.22, ease: "easeInOut" }}
      animate={{ width: sidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
      className="flex h-full shrink-0 flex-col border-r border-border bg-[rgba(9,4,20,0.82)] backdrop-blur-xl"
    >
      <AnimatePresence mode="wait" initial={false}>
        {sidebarExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {sidebarExpandedContent}
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex min-h-0 flex-1"
          >
            {sidebarCollapsedRail}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )

  return (
    <AuthGuard>
      <div className="relative h-dvh overflow-hidden bg-background" data-testid="chat-page">
        <div className="flex h-full">
          <div className="hidden h-full lg:block">{sidebar}</div>

          <div className="relative flex min-w-0 flex-1 flex-col">
            <div
              data-testid="chat-state-indicator"
              data-chat-state={isNewChatState ? "new" : "active"}
              className="sr-only"
            />
            <header className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
              <button
                type="button"
                data-testid="chat-mobile-menu-open"
                onClick={() => setMobileSidebarOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              >
                <Menu className="h-4 w-4" />
                {isRo ? "Meniu" : "Menu"}
              </button>
              <span className="text-sm font-semibold text-foreground">AstroAI 24/7</span>
            </header>

            <div ref={scrollRef} className="cosmic-scrollbar flex-1 overflow-y-auto" data-testid="chat-messages-container">
              <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
                {loadingMessages ? (
                  <MessagesSkeletonList />
                ) : (
                  <>
                    {isNewChatState && (
                      <div
                        data-testid="chat-empty-state"
                        className="flex flex-1 flex-col items-center justify-center py-10"
                      >
                        <p className="max-w-md text-center text-sm text-muted-foreground">
                          {isRo
                            ? "Întreabă agentul ales despre hartă natală, iubire, carieră sau ghidaj zilnic."
                            : "Ask your selected agent about your birth chart, love, career, or daily guidance."}
                        </p>
                        <div className="mt-5">{renderSuggestedPrompts()}</div>
                      </div>
                    )}

                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        data-testid={msg.role === "user" ? "chat-message-user" : "chat-message-assistant"}
                        data-message-status={msg.deliveryStatus ?? "completed"}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role === "user" ? (
                          <div className="group relative max-w-[88%] rounded-2xl rounded-br-md border border-[rgba(109,75,255,0.3)] bg-[rgba(109,75,255,0.2)] px-5 pb-3 pt-9 pr-10 text-sm text-foreground sm:max-w-[75%]">
                            <ChatMessageCopyButton content={msg.content} align="right" />
                            {msg.content}
                          </div>
                        ) : msg.deliveryStatus === "streaming" ? (
                          <AgentThinkingIndicator
                            agentType={msg.agentType ?? activeAgent}
                            getAgentLabel={(agentType) => getAgentLabel(agentType, isRo)}
                            hasAstralProfile={natalReady === true}
                            startedAt={msg.pendingStartedAt ?? Date.now()}
                            onStop={handleStopSend}
                          />
                        ) : (
                          <div className="max-w-[92%] sm:max-w-[82%]">
                            {msg.agent && (
                              <div className="mb-2 flex items-center gap-2">
                                <AgentAvatar agentType={msg.agentType ?? activeAgent} size="md" showRing priority={false} />
                                <span
                                  className="text-xs font-semibold tracking-wide"
                                  style={{ color: msg.agentType ? agentAvatarCatalog[msg.agentType].accentColor : "#B69CFF" }}
                                >
                                  {msg.agent}
                                </span>
                              </div>
                            )}
                            {msg.deliveryStatus === "failed" && msg.error ? (
                              <ChatErrorMessage
                                errorCode={msg.error.code}
                                retryable={msg.error.retryable}
                                action={msg.error.action}
                                onRetry={
                                  msg.retryRequest
                                    ? () => handleRetrySend(msg.retryRequest!, msg.id)
                                    : undefined
                                }
                              />
                            ) : (
                              <div className="group relative rounded-2xl rounded-bl-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-5 py-4 pr-10 text-sm leading-relaxed text-foreground">
                                {msg.content ? <ChatMessageCopyButton content={msg.content} align="right" /> : null}
                                {msg.content.split("\n\n").map((paragraph, index) => (
                                  <p key={index} className={index > 0 ? "mt-3" : ""}>
                                    {paragraph}
                                  </p>
                                ))}
                              </div>
                            )}
                            {msg.warningCode ? (
                              <div className="mt-2">
                                <ChatErrorMessage
                                  errorCode={msg.warningCode}
                                  retryable={false}
                                  action="none"
                                />
                              </div>
                            ) : null}
                            {msg.ctas && msg.ctas.length > 0 && (
                              <div className="mt-3 space-y-3">
                                {msg.ctas
                                  .filter(
                                    (cta) => cta.action === "switch_agent" && cta.targetAgent
                                  )
                                  .map((cta) => (
                                    <div
                                      key={`${msg.id}-${cta.action}-${cta.targetAgent}`}
                                      className="flex flex-col items-start gap-2"
                                    >
                                      <button
                                        type="button"
                                        data-testid="chat-switch-agent-cta"
                                        onClick={() =>
                                          handleSwitchAgent(cta.targetAgent!, cta.prefillQuestion)
                                        }
                                        className={`inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-semibold ${
                                          cta.variant === "primary"
                                            ? "bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] text-foreground"
                                            : "border border-border bg-[rgba(255,255,255,0.04)] text-muted-foreground hover:text-foreground"
                                        }`}
                                      >
                                        <AgentAvatar
                                          agentType={cta.targetAgent!}
                                          size="sm"
                                          showRing={false}
                                          priority={false}
                                        />
                                        <span>{cta.label}</span>
                                      </button>
                                      {msg.handoffReason && (
                                        <p
                                          data-testid="chat-handoff-reason"
                                          className="max-w-md text-xs leading-relaxed text-muted-foreground"
                                        >
                                          {msg.handoffReason}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                {msg.ctas.some(
                                  (cta) =>
                                    cta.action !== "switch_agent" ||
                                    !cta.targetAgent
                                ) && (
                                  <div className="flex flex-wrap gap-2">
                                    {msg.ctas.map((cta) =>
                                      cta.action === "generate_divine_data" ? (
                                        <button
                                          key={`${msg.id}-${cta.action}-${cta.label}`}
                                          type="button"
                                          data-testid="chat-generate-divine-cta"
                                          disabled={isGeneratingDivineData}
                                          onClick={() => void handleGenerateDivineData()}
                                          className={`rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-70 ${
                                            cta.variant === "primary"
                                              ? "bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] text-foreground"
                                              : "border border-border bg-[rgba(255,255,255,0.04)] text-muted-foreground hover:text-foreground"
                                          }`}
                                        >
                                          {isGeneratingDivineData
                                            ? t("chat.divine.generateLoading")
                                            : cta.label}
                                        </button>
                                      ) : cta.action === "retry_send" ? (
                                        <button
                                          key={`${msg.id}-${cta.action}-${cta.label}`}
                                          type="button"
                                          data-testid="chat-retry-button"
                                          disabled={isAwaitingResponse || !msg.retryRequest}
                                          onClick={() => {
                                            if (msg.retryRequest) {
                                              handleRetrySend(msg.retryRequest, msg.id)
                                            }
                                          }}
                                          className={`rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-70 ${
                                            cta.variant === "primary"
                                              ? "bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] text-foreground"
                                              : "border border-border bg-[rgba(255,255,255,0.04)] text-muted-foreground hover:text-foreground"
                                          }`}
                                        >
                                          {cta.label}
                                        </button>
                                      ) : cta.action === "switch_agent" && cta.targetAgent ? null : cta.href ? (
                                        <Link
                                          key={`${msg.id}-${cta.href}-${cta.label}`}
                                          href={cta.href}
                                          data-testid="chat-message-link-cta"
                                          className={`rounded-full px-4 py-2 text-xs font-semibold ${
                                            cta.variant === "primary"
                                              ? "bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] text-foreground"
                                              : "border border-border bg-[rgba(255,255,255,0.04)] text-muted-foreground hover:text-foreground"
                                          }`}
                                        >
                                          {cta.label}
                                        </Link>
                                      ) : null
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div
              data-testid="chat-composer-bottom"
              className="bg-[rgba(7,3,17,0.55)] px-4 py-3 backdrop-blur-xl sm:px-6"
            >
              {renderComposer()}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/55"
                onClick={() => setMobileSidebarOpen(false)}
                data-testid="chat-mobile-menu-backdrop"
                aria-label="Close sidebar"
              />
              <motion.div
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="relative h-full w-80 max-w-[88vw]"
              >
                <button
                  type="button"
                  data-testid="chat-mobile-menu-close"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="absolute right-3 top-3 z-20 rounded-md border border-border bg-[rgba(255,255,255,0.06)] p-1.5 text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
                <aside className="flex h-full w-full flex-col border-r border-border bg-[rgba(9,4,20,0.9)] backdrop-blur-xl">
                  {sidebarExpandedContent}
                </aside>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthGuard>
  )
}
