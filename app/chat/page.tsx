"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Sparkles,
  Send,
  Heart,
  Star,
  Sun,
  Moon,
  Compass,
  Briefcase,
  User,
  ChevronDown,
} from "lucide-react"

// --- Starfield Canvas ---
function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    const stars: { x: number; y: number; r: number; o: number; s: number }[] = []

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        o: Math.random(),
        s: Math.random() * 0.005 + 0.002,
      })
    }

    let t = 0
    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 1
      for (const star of stars) {
        const flicker = Math.sin(t * star.s + star.o * 100) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(182, 156, 255, ${star.o * flicker})`
        ctx.fill()
        if (star.r > 1) {
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.r * 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(109, 75, 255, ${star.o * flicker * 0.15})`
          ctx.fill()
        }
      }
      animationId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}

// --- Agent Data ---
const agents = [
  { id: "birth-chart", label: "Birth Chart", icon: Compass, color: "#6D4BFF" },
  { id: "love", label: "Love", icon: Heart, color: "#D66BFF" },
  { id: "compatibility", label: "Compatibility", icon: Star, color: "#8B5CFF" },
  { id: "daily", label: "Daily Guidance", icon: Sun, color: "#FFB86D" },
  { id: "career", label: "Career", icon: Briefcase, color: "#4BC8FF" },
  { id: "spiritual", label: "Spiritual", icon: Sparkles, color: "#B69CFF" },
]

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
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Why do I attract emotionally unavailable partners?",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Your chart reveals a fascinating tension between your Cancer Sun's deep craving for emotional intimacy and your Capricorn Moon's instinct to guard vulnerability. This creates a subconscious pattern where emotionally unavailable connections feel paradoxically \"safe\" — they mirror the familiar dynamic of yearning without the risk of full exposure.\n\nYour Venus in the 7th house squares Neptune, adding a layer of idealization that can make unavailable partners seem more alluring. The good news? Your Libra Rising gives you the awareness to recognize these patterns once you see them clearly.\n\nWould you like me to look at your upcoming transits to see when the energy shifts toward healthier relationship patterns?",
    agent: "Love Agent",
  },
]

// --- Typing Animation ---
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-cosmic-lavender"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// --- Profile Card ---
function CosmicProfileCard() {
  const [open, setOpen] = useState(false)

  const signs = [
    { label: "Sun", value: "Cancer", icon: Sun, color: "#FFB86D" },
    { label: "Moon", value: "Capricorn", icon: Moon, color: "#B69CFF" },
    { label: "Rising", value: "Libra", icon: Compass, color: "#D66BFF" },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="glass flex items-center gap-2 rounded-xl px-3 py-2 transition-all hover:border-[rgba(109,75,255,0.3)] hover:bg-[rgba(255,255,255,0.08)]"
        aria-label="Toggle cosmic profile"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(109,75,255,0.2)]">
          <User className="h-3.5 w-3.5 text-cosmic-lavender" />
        </div>
        <span className="hidden text-sm font-medium text-foreground sm:inline">My Chart</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="glass-strong absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl p-4"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cosmic Profile
            </p>
            <div className="flex flex-col gap-2.5">
              {signs.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: `${s.color}20` }}
                  >
                    <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    <p className="text-sm font-medium text-foreground">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Main Chat Page ---
export default function CosmicChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [activeAgent, setActiveAgent] = useState("love")
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  const activeAgentData = agents.find((a) => a.id === activeAgent)

  function handleSend(text?: string) {
    const content = text || input.trim()
    if (!content) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    // Simulated AI response
    setTimeout(() => {
      const responses: Record<string, string> = {
        "birth-chart":
          "Looking at your natal chart, your Cancer Sun in the 4th house creates a deep connection to home, family, and emotional roots. Combined with your Capricorn Moon, there's a beautiful balance between nurturing sensitivity and grounded ambition. Your Libra Rising gives you a natural grace in how you present yourself to the world.",
        love: "Your Venus placement suggests you're entering a powerful period for romantic connections. The upcoming Venus-Jupiter trine in your 5th house could bring unexpected encounters with someone who truly sees your depth. Stay open to connections that feel different from your usual patterns.",
        compatibility:
          "Based on your birth chart, you resonate most strongly with earth and water signs who can match your emotional depth while providing stability. Scorpio and Pisces placements in a partner would harmonize beautifully with your Cancer Sun.",
        daily:
          "Today's cosmic energy favors introspection and creative expression. The Moon in Pisces activates your 6th house, making it an ideal day to establish healthier routines that honor both your practical and spiritual needs.",
        career:
          "Your Midheaven in Cancer suggests a career path that involves nurturing, healing, or creating safe spaces for others. Combined with your Capricorn Moon's ambition, you'd thrive in leadership roles within healthcare, counseling, education, or creative industries.",
        spiritual:
          "Your North Node in Aquarius is calling you toward a spiritual practice that embraces community and innovation. Consider exploring group meditation, sound healing, or connecting with like-minded souls who share your vision for collective transformation.",
      }
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          responses[activeAgent] ||
          "The stars have insights for you. Let me consult your chart...",
        agent: activeAgentData?.label + " Agent",
      }
      setMessages((prev) => [...prev, aiMsg])
      setIsTyping(false)
    }, 2000)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background">
      {/* Starfield */}
      <StarfieldCanvas />

      {/* Radial glows */}
      <div
        className="pointer-events-none fixed left-1/2 top-0 z-0 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(109,75,255,0.25) 0%, rgba(109,75,255,0.05) 50%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed bottom-0 left-0 z-0 h-[600px] w-[600px] -translate-x-1/3 translate-y-1/3 rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(214,107,255,0.2) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed bottom-0 right-0 z-0 h-[500px] w-[500px] translate-x-1/4 translate-y-1/4 rounded-full opacity-25"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,255,0.2) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      {/* ===== Top Bar ===== */}
      <header className="relative z-20 flex items-center justify-between border-b border-border px-4 py-3 backdrop-blur-xl sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(109,75,255,0.15)]">
            <Sparkles className="h-5 w-5 text-cosmic-violet" />
            <div
              className="absolute inset-0 rounded-xl opacity-50"
              style={{
                boxShadow: "0 0 15px rgba(109,75,255,0.3)",
              }}
            />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-space-grotesk, var(--font-sans))" }}>
              Cosmic AI
            </h1>
          </div>
        </Link>

        <CosmicProfileCard />
      </header>

      {/* ===== Agent Selector ===== */}
      <div className="relative z-10 border-b border-border bg-[rgba(7,3,17,0.6)] backdrop-blur-lg">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto">
            {agents.map((agent) => {
              const isActive = activeAgent === agent.id
              return (
                <button
                  key={agent.id}
                  onClick={() => setActiveAgent(agent.id)}
                  className={`group relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={
                    isActive
                      ? {
                          background: `${agent.color}18`,
                          boxShadow: `0 0 20px ${agent.color}20, inset 0 0 20px ${agent.color}08`,
                          border: `1px solid ${agent.color}40`,
                        }
                      : {
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }
                  }
                  aria-pressed={isActive}
                >
                  <agent.icon
                    className="h-4 w-4 transition-colors"
                    style={{ color: isActive ? agent.color : undefined }}
                  />
                  <span className="whitespace-nowrap">{agent.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ===== Messages ===== */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i === messages.length - 1 ? 0.1 : 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div className="max-w-[85%] sm:max-w-[75%]">
                  <div
                    className="rounded-2xl rounded-br-md px-5 py-3.5 text-[15px] leading-relaxed text-foreground"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(109,75,255,0.25) 0%, rgba(139,92,255,0.15) 100%)",
                      border: "1px solid rgba(109,75,255,0.25)",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="max-w-[90%] sm:max-w-[85%]">
                  {/* Agent label */}
                  {msg.agent && (
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          background: `${activeAgentData?.color || "#6D4BFF"}20`,
                        }}
                      >
                        <Sparkles
                          className="h-3 w-3"
                          style={{ color: activeAgentData?.color || "#6D4BFF" }}
                        />
                      </div>
                      <span
                        className="text-xs font-semibold tracking-wide"
                        style={{ color: activeAgentData?.color || "#B69CFF" }}
                      >
                        {msg.agent}
                      </span>
                    </div>
                  )}
                  <div
                    className="rounded-2xl rounded-bl-md px-5 py-4 text-[15px] leading-relaxed text-foreground"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {msg.content.split("\n\n").map((paragraph, pi) => (
                      <p key={pi} className={pi > 0 ? "mt-3" : ""}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%]">
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full"
                      style={{
                        background: `${activeAgentData?.color || "#6D4BFF"}20`,
                      }}
                    >
                      <Sparkles
                        className="h-3 w-3"
                        style={{ color: activeAgentData?.color || "#6D4BFF" }}
                      />
                    </div>
                    <span
                      className="text-xs font-semibold tracking-wide"
                      style={{ color: activeAgentData?.color || "#B69CFF" }}
                    >
                      {activeAgentData?.label} Agent
                    </span>
                  </div>
                  <div
                    className="rounded-2xl rounded-bl-md px-5 py-4"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <TypingIndicator />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ===== Bottom Input Area ===== */}
      <div className="relative z-20 border-t border-border bg-[rgba(7,3,17,0.7)] backdrop-blur-xl">
        {/* Prompt Chips */}
        {messages.length <= 2 && (
          <div className="mx-auto max-w-3xl px-4 pt-4">
            <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="group shrink-0 rounded-full px-4 py-2 text-sm text-muted-foreground transition-all hover:text-foreground"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(109,75,255,0.12)"
                    e.currentTarget.style.borderColor = "rgba(109,75,255,0.3)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Input */}
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div
            className="relative flex items-end gap-3 rounded-2xl px-4 py-3 transition-all focus-within:border-[rgba(109,75,255,0.4)] focus-within:shadow-[0_0_30px_rgba(109,75,255,0.12)]"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${activeAgentData?.label || "Cosmic"} Agent anything...`}
              rows={1}
              className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder-muted-foreground outline-none"
              style={{
                height: "auto",
                overflowY: input.split("\n").length > 4 ? "auto" : "hidden",
              }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = "auto"
                el.style.height = Math.min(el.scrollHeight, 128) + "px"
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-30"
              style={{
                background:
                  input.trim() && !isTyping
                    ? "linear-gradient(135deg, #6D4BFF 0%, #8B5CFF 100%)"
                    : "rgba(255,255,255,0.06)",
                boxShadow:
                  input.trim() && !isTyping
                    ? "0 0 20px rgba(109,75,255,0.4)"
                    : "none",
              }}
              aria-label="Send message"
            >
              <Send className="h-4 w-4 text-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground/50">
            {"Cosmic AI uses your birth chart data to provide personalized insights. Not a substitute for professional advice."}
          </p>
        </div>
      </div>

      {/* Scrollbar hiding */}
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
  )
}
