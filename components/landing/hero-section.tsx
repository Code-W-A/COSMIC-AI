"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight,
  Sparkles,
  Sun,
  Moon,
  Sunrise,
  Zap,
  Heart,
  Star,
  Send,
} from "lucide-react"

/* ─── Stars canvas ─── */
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let stars: { x: number; y: number; r: number; o: number; speed: number; pulse: number; pSpeed: number }[] = []

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio)
      initStars()
    }

    function initStars() {
      if (!canvas) return
      const count = Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 3500)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        r: Math.random() * 1.4 + 0.3,
        o: Math.random() * 0.6 + 0.15,
        speed: Math.random() * 0.15 + 0.02,
        pulse: Math.random() * Math.PI * 2,
        pSpeed: Math.random() * 0.008 + 0.003,
      }))
    }

    function draw() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      for (const s of stars) {
        s.pulse += s.pSpeed
        const opacity = s.o + Math.sin(s.pulse) * 0.25
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(182, 156, 255, ${Math.max(0.05, opacity)})`
        ctx.fill()

        // subtle glow on brighter stars
        if (s.r > 1) {
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(139, 92, 255, ${Math.max(0.01, opacity * 0.12)})`
          ctx.fill()
        }
      }
      animationId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener("resize", resize)
    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  )
}

/* ─── Typing indicator dots ─── */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-[#B69CFF]"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        />
      ))}
    </span>
  )
}

/* ─── Chat mockup data ─── */
const chatMessages = [
  {
    role: "user" as const,
    text: "Why do I keep attracting emotionally unavailable partners?",
  },
  {
    role: "ai" as const,
    text: "Your Venus square Saturn creates a deep fear of vulnerability that unconsciously draws you toward partners who mirror that emotional distance. Your Moon in Capricorn adds a need for control in love, while your 7th house Pluto suggests intense yet transformative relationship patterns.",
    tags: [
      { label: "Moon in Capricorn", icon: Moon, color: "#6D4BFF" },
      { label: "Venus Square Saturn", icon: Heart, color: "#D66BFF" },
    ],
  },
]

/* ─── Floating data cards ─── */
const floatingCards = [
  {
    label: "Sun Sign",
    value: "Cancer",
    icon: Sun,
    position: "left-[-6%] top-[14%]",
    glow: "shadow-[0_0_25px_rgba(255,180,60,0.15)]",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    delay: 0,
    animClass: "animate-float",
  },
  {
    label: "Moon Sign",
    value: "Capricorn",
    icon: Moon,
    position: "right-[-6%] top-[8%]",
    glow: "shadow-[0_0_25px_rgba(109,75,255,0.2)]",
    iconBg: "bg-[#6D4BFF]/15",
    iconColor: "text-[#B69CFF]",
    delay: 0.15,
    animClass: "animate-float-delayed",
  },
  {
    label: "Rising Sign",
    value: "Libra",
    icon: Sunrise,
    position: "left-[-8%] top-[58%]",
    glow: "shadow-[0_0_25px_rgba(214,107,255,0.15)]",
    iconBg: "bg-[#D66BFF]/15",
    iconColor: "text-[#D66BFF]",
    delay: 0.3,
    animClass: "animate-float-slow",
  },
  {
    label: "Daily Energy",
    value: "Emotional clarity",
    icon: Zap,
    position: "right-[-7%] top-[45%]",
    glow: "shadow-[0_0_25px_rgba(52,211,153,0.15)]",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    delay: 0.45,
    animClass: "animate-float",
  },
  {
    label: "Compatibility",
    value: "82% Match",
    icon: Heart,
    position: "right-[-4%] top-[78%]",
    glow: "shadow-[0_0_25px_rgba(244,114,182,0.15)]",
    iconBg: "bg-pink-500/15",
    iconColor: "text-pink-400",
    delay: 0.6,
    animClass: "animate-float-delayed",
  },
]

/* ─── Main Hero ─── */
export function HeroSection() {
  const [showResponse, setShowResponse] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowResponse(true), 1800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="relative min-h-screen overflow-hidden pt-28 pb-24 lg:pt-36 lg:pb-32">
      {/* ── Layered background ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Core radial glow — violet center */}
        <div className="absolute top-[20%] left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#6D4BFF]/[0.14] blur-[160px]" />
        {/* Secondary indigo glow — offset right */}
        <div className="absolute top-[45%] right-[10%] h-[500px] w-[500px] rounded-full bg-[#4B3FCC]/[0.10] blur-[130px]" />
        {/* Tertiary pink-violet — lower left */}
        <div className="absolute bottom-[5%] left-[15%] h-[400px] w-[400px] rounded-full bg-[#D66BFF]/[0.07] blur-[120px]" />
        {/* Subtle warm accent — top right corner */}
        <div className="absolute top-0 right-0 h-[300px] w-[300px] rounded-full bg-[#8B5CFF]/[0.06] blur-[100px]" />
      </div>

      {/* Star field canvas */}
      <StarField />

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-[#6D4BFF]/25 bg-[#6D4BFF]/[0.08] px-5 py-2 backdrop-blur-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#B69CFF]" />
            <span className="text-xs font-medium tracking-wide text-[#B69CFF]">
              AI-Powered Astrology Guidance
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="max-w-4xl text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Your Personal{" "}
            <span className="text-gradient-cosmic">Astrology AI</span>{" "}
            Agent
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Ask questions about love, purpose, compatibility, and your birth
            chart — and get deeply personalized answers powered by real
            astrology data and AI.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="/onboarding"
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-8 py-3.5 text-sm font-semibold text-foreground shadow-lg shadow-[#6D4BFF]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#6D4BFF]/40 hover:brightness-110"
            >
              {/* shimmer sweep */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <Star className="h-4 w-4" />
              Start Free Reading
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
            <a
              href="#agents"
              className="inline-flex items-center gap-2.5 rounded-full border border-border bg-[rgba(255,255,255,0.04)] px-8 py-3.5 text-sm font-semibold text-foreground backdrop-blur-sm transition-all duration-300 hover:border-[#6D4BFF]/30 hover:bg-[rgba(255,255,255,0.08)]"
            >
              Meet the Agents
            </a>
          </motion.div>
        </div>

        {/* ── Chat mockup ── */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-20 max-w-3xl lg:mt-24"
        >
          {/* Ambient glow behind the chat card */}
          <div
            className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[#6D4BFF]/[0.06] blur-[60px]"
            aria-hidden="true"
          />

          {/* ── Floating cards (desktop only) ── */}
          <div className="hidden lg:block" aria-hidden="true">
            {floatingCards.map((card) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.9 + card.delay }}
                className={`absolute z-20 ${card.position} ${card.animClass}`}
                style={{ animationDelay: `${card.delay * 3}s` }}
              >
                <div
                  className={`flex items-center gap-3 rounded-2xl border border-border bg-[#0D0820]/80 px-4 py-3 backdrop-blur-xl ${card.glow}`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
                  >
                    <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      {card.label}
                    </p>
                    <p className="text-xs font-semibold text-foreground">
                      {card.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Chat window ── */}
          <div className="relative rounded-3xl border border-border bg-[#0D0820]/60 p-1 shadow-2xl shadow-[#6D4BFF]/[0.08] backdrop-blur-xl">
            {/* Gradient border glow ring */}
            <div
              className="pointer-events-none absolute -inset-px rounded-3xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(109,75,255,0.25), rgba(214,107,255,0.12), rgba(109,75,255,0.05))",
                mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                maskComposite: "exclude",
                padding: "1px",
              }}
              aria-hidden="true"
            />

            <div className="rounded-[20px] bg-[#0A0618] p-5 sm:p-7">
              {/* Agent header bar */}
              <div className="mb-5 flex items-center gap-3.5 rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] px-4 py-3.5">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6D4BFF] to-[#D66BFF]">
                  <Heart className="h-4.5 w-4.5 text-foreground" />
                  {/* online dot */}
                  <span className="absolute -right-0.5 -bottom-0.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-[#0A0618]">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Love Agent
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Relationship patterns & emotional insight
                  </p>
                </div>
                <div className="ml-auto flex gap-1">
                  {["Career", "Purpose"].map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-border bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-[#6D4BFF]/30 hover:text-foreground"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-4">
                {/* User message */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[82%] rounded-2xl rounded-br-lg bg-gradient-to-br from-[#6D4BFF] to-[#7C5AFF] px-5 py-3.5 shadow-lg shadow-[#6D4BFF]/10">
                    <p className="text-sm leading-relaxed text-foreground">
                      {chatMessages[0].text}
                    </p>
                  </div>
                </motion.div>

                {/* AI response — with reveal animation */}
                <AnimatePresence>
                  {!showResponse && (
                    <motion.div
                      key="typing"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4, delay: 1.0 }}
                      className="flex justify-start"
                    >
                      <div className="rounded-2xl rounded-bl-lg border border-border bg-[rgba(255,255,255,0.03)] px-5 py-4">
                        <TypingDots />
                      </div>
                    </motion.div>
                  )}

                  {showResponse && (
                    <motion.div
                      key="response"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[88%] rounded-2xl rounded-bl-lg border border-border bg-[rgba(255,255,255,0.03)] px-5 py-4">
                        <p className="text-sm leading-relaxed text-foreground/90">
                          {chatMessages[1].text}
                        </p>
                        {/* Tags */}
                        <div className="mt-3.5 flex flex-wrap items-center gap-2">
                          {chatMessages[1].tags.map((tag) => (
                            <span
                              key={tag.label}
                              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium"
                              style={{
                                backgroundColor: `${tag.color}15`,
                                color: tag.color,
                              }}
                            >
                              <tag.icon className="h-3 w-3" />
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Prompt chips */}
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "What's my love language?",
                  "Career path this year",
                  "Am I in a Saturn return?",
                ].map((q) => (
                  <span
                    key={q}
                    className="rounded-full border border-border bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-[#6D4BFF]/30 hover:text-foreground"
                  >
                    {q}
                  </span>
                ))}
              </div>

              {/* Input bar */}
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <p className="flex-1 text-sm text-muted-foreground/50">
                  Ask about your chart, love, or purpose...
                </p>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] shadow-lg shadow-[#6D4BFF]/20">
                  <Send className="h-4 w-4 text-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Trust bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.6 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-medium tracking-wide text-muted-foreground/60"
          >
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-1 rounded-full bg-emerald-400/60" />
              Real-time chart data
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-1 rounded-full bg-[#6D4BFF]/60" />
              Private & encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-1 rounded-full bg-[#D66BFF]/60" />
              10k+ active users
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
