"use client"

import { motion } from "framer-motion"
import {
  Compass,
  Heart,
  Users,
  Sun,
  Briefcase,
  Flame,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { useEffect, useRef } from "react"

const agents = [
  {
    icon: Compass,
    title: "Birth Chart Agent",
    description:
      "Understand your personality, emotional patterns, strengths, challenges, and life lessons through your natal chart.",
    example: "What does my chart reveal about who I am?",
    gradient: "from-[#6D4BFF] to-[#4B32CC]",
    glowColor: "rgba(109, 75, 255, 0.5)",
    haloColor: "rgba(109, 75, 255, 0.15)",
    accentColor: "#6D4BFF",
  },
  {
    icon: Heart,
    title: "Love Agent",
    description:
      "Explore how you love, what you need emotionally, and why certain relationship patterns repeat.",
    example: "Why do I attract the same type of relationships?",
    gradient: "from-[#D66BFF] to-[#A84FCC]",
    glowColor: "rgba(214, 107, 255, 0.5)",
    haloColor: "rgba(214, 107, 255, 0.15)",
    accentColor: "#D66BFF",
  },
  {
    icon: Users,
    title: "Compatibility Agent",
    description:
      "Discover attraction, communication, emotional connection, and tension between two people.",
    example: "Are we truly compatible?",
    gradient: "from-[#8B5CFF] to-[#6D4BFF]",
    glowColor: "rgba(139, 92, 255, 0.5)",
    haloColor: "rgba(139, 92, 255, 0.15)",
    accentColor: "#8B5CFF",
  },
  {
    icon: Sun,
    title: "Daily Guidance Agent",
    description:
      "Receive your cosmic message of the day, including reflections, affirmations, and energetic guidance.",
    example: "What should I focus on today?",
    gradient: "from-[#B69CFF] to-[#8B5CFF]",
    glowColor: "rgba(182, 156, 255, 0.5)",
    haloColor: "rgba(182, 156, 255, 0.15)",
    accentColor: "#B69CFF",
  },
  {
    icon: Briefcase,
    title: "Career & Purpose Agent",
    description:
      "Ask about talents, ambition, money patterns, work style, and life direction.",
    example: "What career path fits my chart?",
    gradient: "from-[#6D4BFF] to-[#4B32CC]",
    glowColor: "rgba(109, 75, 255, 0.5)",
    haloColor: "rgba(109, 75, 255, 0.15)",
    accentColor: "#6D4BFF",
  },
  {
    icon: Flame,
    title: "Spiritual Reflection Agent",
    description:
      "Turn confusion into clarity through deeper questions about intuition, emotions, healing, and growth.",
    example: "What emotional lesson am I meant to understand right now?",
    gradient: "from-[#D66BFF] to-[#A84FCC]",
    glowColor: "rgba(214, 107, 255, 0.5)",
    haloColor: "rgba(214, 107, 255, 0.15)",
    accentColor: "#D66BFF",
  },
]

function CosmicParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()

    const particles: {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number
      pulse: number
      pulseSpeed: number
      color: string
    }[] = []

    const colors = [
      "rgba(109, 75, 255,",
      "rgba(139, 92, 255,",
      "rgba(182, 156, 255,",
      "rgba(214, 107, 255,",
    ]

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        size: Math.random() * 2.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.6 + 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      particles.forEach((p) => {
        p.x += p.speedX
        p.y += p.speedY
        p.pulse += p.pulseSpeed

        const currentOpacity =
          p.opacity * (0.5 + 0.5 * Math.sin(p.pulse))

        if (p.x < 0) p.x = canvas.offsetWidth
        if (p.x > canvas.offsetWidth) p.x = 0
        if (p.y < 0) p.y = canvas.offsetHeight
        if (p.y > canvas.offsetHeight) p.y = 0

        // Glow
        ctx.beginPath()
        const glow = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          p.size * 4
        )
        glow.addColorStop(0, `${p.color}${currentOpacity})`)
        glow.addColorStop(1, `${p.color}0)`)
        ctx.fillStyle = glow
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.fillStyle = `${p.color}${currentOpacity})`
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    window.addEventListener("resize", resize)
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}

function AgentCard({
  agent,
  index,
}: {
  agent: (typeof agents)[number]
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.7,
        delay: index * 0.1,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className="group relative"
    >
      {/* Violet halo behind card */}
      <div
        className="pointer-events-none absolute -inset-3 rounded-[2rem] opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100"
        style={{ background: agent.haloColor }}
      />
      <div
        className="pointer-events-none absolute -inset-1 rounded-[2rem] opacity-40 blur-xl"
        style={{ background: agent.haloColor }}
      />

      {/* Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-8 backdrop-blur-xl transition-all duration-700 group-hover:border-[rgba(255,255,255,0.18)] group-hover:bg-[rgba(255,255,255,0.08)] group-hover:shadow-2xl">
        {/* Top-right corner glow on hover */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-0 blur-[80px] transition-all duration-700 group-hover:opacity-60"
          style={{ background: agent.accentColor }}
        />

        {/* Bottom gradient border on hover */}
        <div
          className="pointer-events-none absolute right-0 bottom-0 left-0 h-px opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{
            background: `linear-gradient(90deg, transparent, ${agent.accentColor}, transparent)`,
          }}
        />

        {/* Shimmer line on hover */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
          <div
            className="absolute top-0 right-0 left-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${agent.accentColor}80, transparent)`,
            }}
          />
        </div>

        <div className="relative flex h-full flex-col">
          {/* Glowing circular icon */}
          <div className="relative mb-6">
            <div
              className="absolute inset-0 h-16 w-16 rounded-full opacity-50 blur-xl transition-all duration-700 group-hover:opacity-80 group-hover:blur-2xl"
              style={{ background: agent.accentColor }}
            />
            <div
              className="relative flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-700 group-hover:scale-110"
              style={{
                background: `linear-gradient(145deg, ${agent.accentColor}30, ${agent.accentColor}10)`,
                borderColor: `${agent.accentColor}40`,
                boxShadow: `0 0 20px ${agent.accentColor}20, inset 0 1px 0 rgba(255,255,255,0.1)`,
              }}
            >
              <agent.icon
                className="h-7 w-7 transition-all duration-500 group-hover:scale-110"
                style={{ color: agent.accentColor }}
                strokeWidth={1.5}
              />
            </div>
          </div>

          {/* Title */}
          <h3 className="mb-3 text-xl font-semibold tracking-tight text-[#F5F2FF] transition-colors duration-500 group-hover:text-white">
            {agent.title}
          </h3>

          {/* Description */}
          <p className="mb-6 flex-1 text-sm leading-relaxed text-[#9B94C0]">
            {agent.description}
          </p>

          {/* Example question */}
          <div
            className="mb-6 rounded-2xl border px-5 py-4 transition-all duration-500 group-hover:border-[rgba(255,255,255,0.10)]"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <div className="mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#B69CFF]" strokeWidth={2} />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#B69CFF]/70">
                Example
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#C8C2E6] italic">
              {'"'}
              {agent.example}
              {'"'}
            </p>
          </div>

          {/* CTA Button */}
          <button
            className="group/btn relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-500"
            style={{
              background: `linear-gradient(135deg, ${agent.accentColor}20, ${agent.accentColor}08)`,
              color: agent.accentColor,
              border: `1px solid ${agent.accentColor}25`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `linear-gradient(135deg, ${agent.accentColor}35, ${agent.accentColor}15)`
              e.currentTarget.style.borderColor = `${agent.accentColor}50`
              e.currentTarget.style.boxShadow = `0 0 24px ${agent.accentColor}20`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `linear-gradient(135deg, ${agent.accentColor}20, ${agent.accentColor}08)`
              e.currentTarget.style.borderColor = `${agent.accentColor}25`
              e.currentTarget.style.boxShadow = "none"
            }}
          >
            Ask this agent
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export function AgentsSection() {
  return (
    <section id="agents" className="relative overflow-hidden py-36 lg:py-44">
      {/* Layered background effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Primary large glow */}
        <div className="absolute top-1/4 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-[#6D4BFF]/8 blur-[200px]" />
        {/* Secondary glow */}
        <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-[#8B5CFF]/6 blur-[180px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-[#D66BFF]/5 blur-[160px]" />
        {/* Subtle top/bottom vignette */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#070311] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#070311] to-transparent" />
      </div>

      {/* Cosmic particles */}
      <CosmicParticles />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mb-20 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(109,75,255,0.25)] bg-[rgba(109,75,255,0.08)] px-5 py-2"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#B69CFF]" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B69CFF]">
              AI Agents
            </span>
          </motion.div>

          <h2 className="text-4xl font-bold tracking-tight text-[#F5F2FF] text-balance sm:text-5xl lg:text-6xl">
            Meet Your{" "}
            <span className="text-gradient-cosmic">Cosmic AI Agents</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#9B94C0] text-pretty lg:text-lg">
            Each agent uses your birth chart, horoscope data, and personal
            context to guide you through love, purpose, compatibility, and
            self-discovery.
          </p>

          {/* Decorative line */}
          <div className="mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-[#6D4BFF]/50 to-transparent" />
        </motion.div>

        {/* Agent cards grid */}
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent, i) => (
            <AgentCard key={agent.title} agent={agent} index={i} />
          ))}
        </div>

        {/* Bottom decorative element */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-20 flex flex-col items-center gap-4"
        >
          <div className="h-px w-48 bg-gradient-to-r from-transparent via-[#6D4BFF]/30 to-transparent" />
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#6D4BFF]/40">
            Powered by advanced astrological AI
          </p>
        </motion.div>
      </div>
    </section>
  )
}
