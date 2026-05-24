"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Compass, Heart, Users, Sun, Briefcase, Flame } from "lucide-react"
import { useTranslations } from "@/lib/i18n/client"

const baseAgentPills = [
  { label: "Love Agent", icon: Heart },
  { label: "Birth Chart", icon: Compass },
  { label: "Compatibility", icon: Users },
  { label: "Daily Guidance", icon: Sun },
  { label: "Career", icon: Briefcase },
  { label: "Spiritual", icon: Flame },
]

const basePromptChips = [
  "What does my chart say about love?",
  "Why do I attract the same patterns?",
  "What should I focus on today?",
  "Are we compatible?",
  "What is my purpose?",
]

const baseSampleConversation = [
  {
    role: "user" as const,
    text: "What does my chart say about love?",
  },
  {
    role: "ai" as const,
    text: "Based on your Venus in Pisces and Moon in Capricorn, you crave deep emotional connection but may guard your heart behind a protective exterior. Your ideal partner is someone who provides stability while also honoring your deep sensitivity and romantic idealism.",
  },
  {
    role: "user" as const,
    text: "Why do I attract the same patterns?",
  },
  {
    role: "ai" as const,
    text: "Your South Node in Libra suggests a karmic pattern of over-giving in relationships. Combined with your Saturn square Venus, there is a cycle of seeking validation through love. The lesson here is to cultivate self-worth independently of partnerships.",
  },
]

export function ChatPreview() {
  const { locale } = useTranslations()
  const isRo = locale === "ro"
  const agentPills = isRo
    ? [
        { label: "Agent Love", icon: Heart },
        { label: "Birth Chart", icon: Compass },
        { label: "Compatibilitate", icon: Users },
        { label: "Ghidaj zilnic", icon: Sun },
        { label: "Carieră", icon: Briefcase },
        { label: "Spiritual", icon: Flame },
      ]
    : baseAgentPills
  const promptChips = isRo
    ? [
        "Ce spune harta mea despre iubire?",
        "De ce repet aceleași tipare?",
        "Pe ce să mă concentrez azi?",
        "Suntem compatibili?",
        "Care este scopul meu?",
      ]
    : basePromptChips
  const sampleConversation = isRo
    ? [
        {
          role: "user" as const,
          text: "Ce spune harta mea despre iubire?",
        },
        {
          role: "ai" as const,
          text: "Pe baza lui Venus în Pești și a Lunii în Capricorn, îți dorești conexiune profundă, dar poți proteja vulnerabilitatea. Partenerul ideal îți oferă stabilitate și respectă sensibilitatea ta.",
        },
        {
          role: "user" as const,
          text: "De ce repet aceleași tipare?",
        },
        {
          role: "ai" as const,
          text: "Nodul Sud în Balanță poate arăta un tipar karmic de over-giving în relații. Cu Saturn în aspect tensionat cu Venus, apare ciclul validării prin iubire. Lecția cheie este consolidarea valorii personale.",
        },
      ]
    : baseSampleConversation
  const [activeAgent, setActiveAgent] = useState(0)

  return (
    <section id="experience" className="relative py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 right-1/3 h-[500px] w-[500px] rounded-full bg-[#8B5CFF]/8 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-[#B69CFF]">
            {isRo ? "Experiență" : "Experience"}
          </span>
          <h2 className="text-3xl font-bold text-[#F5F2FF] text-balance sm:text-4xl lg:text-5xl">
            {isRo ? "O conversație care" : "A conversation that"}{" "}
            <span className="text-gradient-cosmic">
              {isRo ? "te înțelege" : "understands you"}
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#B8B2D9]">
            {isRo
              ? "Explorează un chat personalizat cu agenți AI care îți cunosc harta natală și blueprint-ul cosmic."
              : "Explore a personalized chat experience with AI agents who know your birth chart and cosmic blueprint."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="glass-strong rounded-3xl p-1 glow-violet">
            <div className="rounded-[22px] bg-[#0D0820] p-6 md:p-8">
              {/* Agent selector pills */}
              <div className="mb-6 flex flex-wrap gap-2">
                {agentPills.map((agent, i) => (
                  <button
                    key={agent.label}
                    onClick={() => setActiveAgent(i)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                      activeAgent === i
                        ? "bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] text-[#F5F2FF] shadow-lg shadow-[#6D4BFF]/20"
                        : "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[#B8B2D9] hover:bg-[rgba(255,255,255,0.06)]"
                    }`}
                  >
                    <agent.icon className="h-3.5 w-3.5" />
                    {agent.label}
                  </button>
                ))}
              </div>

              {/* Conversation */}
              <div className="mb-6 space-y-4 max-h-[400px] overflow-y-auto">
                {sampleConversation.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                        msg.role === "user"
                          ? "rounded-br-md bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF]"
                          : "rounded-bl-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"
                      }`}
                    >
                      <p className="text-sm leading-relaxed text-[#F5F2FF]/90">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prompt chips */}
              <div className="mb-5 flex flex-wrap gap-2">
                {promptChips.map((chip) => (
                  <span
                    key={chip}
                    className="cursor-pointer rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3.5 py-2 text-xs text-[#B8B2D9] transition-all hover:border-[#6D4BFF]/30 hover:bg-[#6D4BFF]/10 hover:text-[#B69CFF]"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {/* Input */}
              <div className="flex items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <p className="flex-1 text-sm text-[#B8B2D9]/50">
                  {isRo
                    ? "Întreabă despre harta ta, iubire sau scop..."
                    : "Ask about your chart, love, or purpose..."}
                </p>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF]">
                  <ArrowRight className="h-4 w-4 text-[#F5F2FF]" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
