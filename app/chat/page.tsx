"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { AuthGuard } from "@/components/auth/auth-guard"
import { AppLogo } from "@/components/branding/app-logo"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { ApiClientError, apiFetch } from "@/lib/api/client"
import { agentAvatarCatalog } from "@/lib/agents/avatar-catalog"
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

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  agent?: string
  agentType?: AgentType
  ctas?: Array<{
    label: string
    href: string
    variant?: "primary" | "secondary"
  }>
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

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-cosmic-lavender"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        />
      ))}
    </div>
  )
}

export default function CosmicChatPage() {
  const router = useRouter()
  const localizedPath = useLocalizedPath()
  const { locale } = useTranslations()
  const isRo = locale === "ro"

  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [agentsAccordionOpen, setAgentsAccordionOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [activeAgent, setActiveAgent] = useState<AgentType>("love")
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [nextConversationsCursor, setNextConversationsCursor] = useState<string | null>(null)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
  const isNewChatState = !loadingMessages && messages.length === 0 && !isTyping

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
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarExpanded ? "1" : "0")
  }, [sidebarExpanded])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

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
      apiFetch<{ success: true; profile: unknown | null; profileComplete?: boolean }>("/api/user/profile").catch(() => null),
    ])
      .then(([conversationPayload, subscriptionPayload, profilePayload]) => {
        if (cancelled) return
        if (!profilePayload?.profile || profilePayload.profileComplete === false) {
          router.replace(localizedPath("/onboarding"))
          return
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
    if (activeConversationId || conversations.length === 0) return
    void openConversation(conversations[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, activeConversationId])

  async function openConversation(conversationId: string) {
    setLoadingMessages(true)
    setActiveConversationId(conversationId)

    try {
      const payload = await apiFetch<{
        success: true
        messages: Array<{ id: string; role: "user" | "assistant"; content: string; agentType: AgentType }>
      }>(`/api/chat/conversations/${conversationId}/messages?limit=200`)

      const hydrated = (payload.messages ?? []).map((item) => ({
        id: item.id,
        role: item.role,
        content: item.content,
        agentType: item.agentType,
        agent: item.role === "assistant" ? `${getAgentPersonaName(item.agentType)} · ${getAgentLabel(item.agentType, isRo)}` : undefined,
      }))

      setMessages(hydrated)
      const lastAssistant = [...hydrated].reverse().find((msg) => msg.role === "assistant")
      if (lastAssistant?.agentType) {
        setActiveAgent(lastAssistant.agentType)
      }
      setMobileSidebarOpen(false)
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  function startNewConversation() {
    setActiveConversationId(null)
    setMessages([])
    setMobileSidebarOpen(false)
    inputRef.current?.focus()
  }

  async function refreshConversations(preferredId?: string) {
    const payload = await fetchConversations()
    const next = payload.conversations ?? []
    setConversations(next)
    setNextConversationsCursor(payload.nextCursor ?? null)

    if (preferredId) {
      setActiveConversationId(preferredId)
    } else if (!activeConversationId && next[0]) {
      setActiveConversationId(next[0].id)
    }
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

  async function handleSend(text?: string) {
    const content = text || input.trim()
    if (!content || isTyping) return

    const asksForDeepReport = /\breport\b|\bdeep\b|\bfull\b|\bcompatibility\b/i.test(content) || activeAgent === "compatibility"

    const userMsg: Message = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content,
      agentType: activeAgent,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    try {
      const payload = await apiFetch<{ success: true; response?: string; conversationId: string; data?: { answer?: string } }>("/api/agents/chat", {
        method: "POST",
        body: {
          agentType: activeAgent,
          message: content,
          conversationId: activeConversationId,
        },
      })

      const aiMsg: Message = {
        id: `local-ai-${Date.now()}`,
        role: "assistant",
        content: payload.data?.answer ?? payload.response ?? (isRo ? "Nu am putut genera un răspuns." : "I could not generate a response."),
        agent: `${activeAgentPersonaName} · ${activeAgentLabel}`,
        agentType: activeAgent,
      }

      setMessages((prev) => [...prev, aiMsg])
      setActiveConversationId(payload.conversationId)
      await refreshConversations(payload.conversationId)

      if (asksForDeepReport) {
        setMessages((prev) => [
          ...prev,
          {
            id: `local-cta-${Date.now()}`,
            role: "assistant",
            content:
              isRo
                ? "Pentru un raport relațional complet, deblochează one-off report (29 RON)."
                : "If you want a full relationship deep report, unlock the one-off report (29 RON).",
            agent: "Cosmic AI",
            agentType: activeAgent,
            ctas: [
              {
                label: isRo ? "Deblochează raportul (29 RON)" : "Unlock report (29 RON)",
                href: localizedPath("/report"),
                variant: "primary",
              },
            ],
          },
        ])
      }
    } catch (chatError) {
      const isUsageLimit =
        chatError instanceof ApiClientError &&
        chatError.status === 403 &&
        (chatError.code === "usage_limit_reached" || chatError.code === "request_failed" || chatError.code === "upgrade_required")

      const aiMsg: Message = {
        id: `local-error-${Date.now()}`,
        role: "assistant",
        content:
          isUsageLimit
            ? isRo
              ? "Ai atins limita gratuită lunară. Poți face upgrade la Premium sau debloca raportul one-off."
              : "You reached your free monthly limit. You can upgrade to Premium or unlock the one-off report."
            : chatError instanceof Error
              ? chatError.message
              : isRo
                ? "Mesajul nu a putut fi procesat acum."
                : "Unable to process your message right now.",
        agent: `${activeAgentPersonaName} · ${activeAgentLabel}`,
        agentType: activeAgent,
        ctas: isUsageLimit
          ? [
              {
                label: isRo ? "Upgrade Premium" : "Upgrade Premium",
                href: localizedPath("/pricing"),
                variant: "primary",
              },
              {
                label: isRo ? "Raport one-off (29 RON)" : "One-off report (29 RON)",
                href: localizedPath("/report"),
                variant: "secondary",
              },
            ]
          : undefined,
      }
      setMessages((prev) => [...prev, aiMsg])
    } finally {
      setIsTyping(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  function formatConversationTime(value: string | null) {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.valueOf())) return ""
    return new Intl.DateTimeFormat(isRo ? "ro-RO" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  function renderComposer(variant: "centered" | "bottom") {
    const wrapperClass =
      variant === "centered"
        ? "mx-auto flex w-full max-w-3xl flex-col items-stretch"
        : "mx-auto flex w-full max-w-6xl flex-col"

    return (
      <div className={wrapperClass}>
        <div className="flex items-end gap-3 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] px-4 py-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRo ? `Întreabă agentul ${activeAgentLabel}...` : `Ask ${activeAgentLabel} Agent...`}
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
            onClick={() => void handleSend()}
            disabled={!input.trim() || isTyping}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] text-foreground disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {variant === "centered" && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => void handleSend(prompt)}
                className="rounded-full border border-border bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
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
          <span className="text-sm font-semibold text-foreground">Cosmic AI</span>
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
                        onClick={() => setActiveAgent(agent.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                          isActive
                            ? "border border-[rgba(109,75,255,0.35)] bg-[rgba(109,75,255,0.14)] text-foreground"
                            : "border border-transparent text-muted-foreground hover:border-border hover:bg-[rgba(255,255,255,0.04)] hover:text-foreground"
                        }`}
                      >
                        <AgentAvatar agentType={agent.id} size="sm" showRing={isActive} priority={false} />
                        <span>{getAgentLabel(agent.id, isRo)}</span>
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
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-[rgba(255,255,255,0.06)]"
            >
              <Plus className="h-3 w-3" />
              {isRo ? "Nou" : "New"}
            </button>
          </div>

          <p className="mb-2 text-[11px] text-muted-foreground">{conversationLimitLabel}</p>

          <div className="hide-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto">
            {loadingConversations ? (
              <p className="text-xs text-muted-foreground">{isRo ? "Se încarcă..." : "Loading..."}</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {isRo ? "Nicio conversație salvată încă." : "No saved conversations yet."}
              </p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => void openConversation(conversation.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    activeConversationId === conversation.id
                      ? "border-[rgba(109,75,255,0.35)] bg-[rgba(109,75,255,0.13)]"
                      : "border-border bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)]"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-foreground">{conversation.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{conversation.lastMessagePreview}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatConversationTime(conversation.updatedAt)}</p>
                </button>
              ))
            )}
          </div>

          {nextConversationsCursor && (
            <button
              type="button"
              onClick={() => void loadMoreConversations()}
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
          {isRo ? "Profil" : "Profile"}
        </Link>
        <button
          type="button"
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
          aria-label={isRo ? "Profil" : "Profile"}
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
      <div className="relative h-dvh overflow-hidden bg-background">
        <div className="flex h-full">
          <div className="hidden h-full lg:block">{sidebar}</div>

          <div className="relative flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              >
                <Menu className="h-4 w-4" />
                {isRo ? "Meniu" : "Menu"}
              </button>
              <span className="text-sm font-semibold text-foreground">Cosmic AI</span>
            </header>

            {!isNewChatState && (
              <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
                  {loadingMessages ? (
                    <p className="text-sm text-muted-foreground">{isRo ? "Se încarcă conversația..." : "Loading conversation..."}</p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.role === "user" ? (
                          <div className="max-w-[88%] rounded-2xl rounded-br-md border border-[rgba(109,75,255,0.3)] bg-[rgba(109,75,255,0.2)] px-5 py-3 text-sm text-foreground sm:max-w-[75%]">
                            {msg.content}
                          </div>
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
                            <div className="rounded-2xl rounded-bl-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-5 py-4 text-sm leading-relaxed text-foreground">
                              {msg.content.split("\n\n").map((paragraph, index) => (
                                <p key={index} className={index > 0 ? "mt-3" : ""}>
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                            {msg.ctas && msg.ctas.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {msg.ctas.map((cta) => (
                                  <Link
                                    key={`${msg.id}-${cta.href}-${cta.label}`}
                                    href={cta.href}
                                    className={`rounded-full px-4 py-2 text-xs font-semibold ${
                                      cta.variant === "primary"
                                        ? "bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] text-foreground"
                                        : "border border-border bg-[rgba(255,255,255,0.04)] text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    {cta.label}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  <AnimatePresence>
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-start"
                      >
                        <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-5 py-4">
                          <TypingIndicator />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
            <AnimatePresence mode="wait" initial={false}>
              {isNewChatState ? (
                <motion.div
                  key="composer-centered"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6"
                >
                  {renderComposer("centered")}
                </motion.div>
              ) : (
                <motion.div
                  key="composer-bottom"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="bg-[rgba(7,3,17,0.55)] px-4 py-3 backdrop-blur-xl sm:px-6"
                >
                  {renderComposer("bottom")}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/55"
                onClick={() => setMobileSidebarOpen(false)}
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

        <style jsx global>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </AuthGuard>
  )
}
