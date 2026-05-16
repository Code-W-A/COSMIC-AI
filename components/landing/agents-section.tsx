"use client"

import { motion } from "framer-motion"
import { Compass, Heart, Users, Sun, Briefcase, Flame, ArrowRight } from "lucide-react"

const agents = [
  {
    icon: Compass,
    title: "Birth Chart Agent",
    description:
      "Understand your personality, emotional patterns, strengths, challenges, and life lessons through your natal chart.",
    example: "What does my chart reveal about who I am?",
    color: "#6D4BFF",
  },
  {
    icon: Heart,
    title: "Love Agent",
    description:
      "Explore how you love, what you need emotionally, and why certain relationship patterns repeat.",
    example: "Why do I attract the same type of relationships?",
    color: "#D66BFF",
  },
  {
    icon: Users,
    title: "Compatibility Agent",
    description:
      "Discover attraction, communication, emotional connection, and tension between two people.",
    example: "Are we truly compatible?",
    color: "#8B5CFF",
  },
  {
    icon: Sun,
    title: "Daily Guidance Agent",
    description:
      "Receive your cosmic message of the day, including reflections, affirmations, and energetic guidance.",
    example: "What should I focus on today?",
    color: "#B69CFF",
  },
  {
    icon: Briefcase,
    title: "Career & Purpose Agent",
    description:
      "Ask about talents, ambition, money patterns, work style, and life direction.",
    example: "What career path fits my chart?",
    color: "#6D4BFF",
  },
  {
    icon: Flame,
    title: "Spiritual Reflection Agent",
    description:
      "Turn confusion into clarity through deeper questions about intuition, emotions, healing, and growth.",
    example: "What emotional lesson am I meant to understand right now?",
    color: "#D66BFF",
  },
]

export function AgentsSection() {
  return (
    <section id="agents" className="relative py-32">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/3 h-[600px] w-[600px] rounded-full bg-[#6D4BFF]/10 blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#D66BFF]/8 blur-[120px]" />
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
            AI Agents
          </span>
          <h2 className="text-3xl font-bold text-[#F5F2FF] text-balance sm:text-4xl lg:text-5xl">
            Meet Your{" "}
            <span className="text-gradient-cosmic">Cosmic AI Agents</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#B8B2D9] text-pretty">
            Each agent uses your birth chart, horoscope data, and personal
            context to guide you through love, purpose, compatibility, and
            self-discovery.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative"
            >
              <div className="glass relative overflow-hidden rounded-3xl p-7 transition-all duration-500 hover:bg-[rgba(255,255,255,0.08)] hover:shadow-xl hover:shadow-[#6D4BFF]/10">
                {/* Hover glow */}
                <div
                  className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-0 blur-[60px] transition-opacity duration-500 group-hover:opacity-100"
                  style={{ backgroundColor: agent.color }}
                />

                <div className="relative">
                  {/* Icon */}
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-500"
                    style={{
                      background: `linear-gradient(135deg, ${agent.color}33, ${agent.color}15)`,
                    }}
                  >
                    <agent.icon
                      className="h-6 w-6 transition-all duration-500 group-hover:scale-110"
                      style={{ color: agent.color }}
                    />
                  </div>

                  <h3 className="mb-2 text-lg font-semibold text-[#F5F2FF]">
                    {agent.title}
                  </h3>
                  <p className="mb-5 text-sm leading-relaxed text-[#B8B2D9]">
                    {agent.description}
                  </p>

                  {/* Example question */}
                  <div className="mb-5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                    <p className="text-xs font-medium text-[#B8B2D9]">
                      <span className="mr-1.5 text-[#B69CFF]">{'"'}</span>
                      {agent.example}
                      <span className="ml-1.5 text-[#B69CFF]">{'"'}</span>
                    </p>
                  </div>

                  {/* CTA */}
                  <button className="group/btn inline-flex items-center gap-2 text-sm font-medium text-[#B69CFF] transition-colors hover:text-[#F5F2FF]">
                    Ask this agent
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
