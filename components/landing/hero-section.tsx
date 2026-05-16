"use client"

import { motion } from "framer-motion"
import { ArrowRight, Sun, Moon, Sunrise, Zap, Heart } from "lucide-react"

const floatingCards = [
  { label: "Sun Sign", value: "Cancer", icon: Sun, x: "-10%", y: "15%", delay: 0 },
  { label: "Moon Sign", value: "Capricorn", icon: Moon, x: "85%", y: "10%", delay: 0.2 },
  { label: "Rising Sign", value: "Libra", icon: Sunrise, x: "-5%", y: "70%", delay: 0.4 },
  { label: "Daily Energy", value: "Emotional clarity", icon: Zap, x: "88%", y: "55%", delay: 0.6 },
  { label: "Compatibility", value: "82%", icon: Heart, x: "80%", y: "80%", delay: 0.8 },
]

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-32 pb-20">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6D4BFF]/20 blur-[120px]" />
        <div className="absolute top-2/3 right-1/4 h-[400px] w-[400px] rounded-full bg-[#D66BFF]/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-[#8B5CFF]/15 blur-[80px]" />
      </div>

      {/* Cosmic particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-[2px] w-[2px] rounded-full bg-[#B69CFF] animate-pulse-glow"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              opacity: Math.random() * 0.6 + 0.2,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6D4BFF]/30 bg-[#6D4BFF]/10 px-4 py-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#6D4BFF] animate-pulse" />
            <span className="text-xs font-medium text-[#B69CFF]">
              AI-Powered Astrology Guidance
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-[#F5F2FF] text-balance sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Your Personal{" "}
            <span className="text-gradient-cosmic">Astrology AI</span>{" "}
            Agent
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg leading-relaxed text-[#B8B2D9] text-pretty"
          >
            Ask questions about love, purpose, compatibility, and your birth
            chart — and receive personalized answers powered by astrology data
            and AI.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="#cta"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-8 py-3.5 text-sm font-semibold text-[#F5F2FF] transition-all hover:shadow-xl hover:shadow-[#6D4BFF]/30"
            >
              Start Free Reading
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#agents"
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] px-8 py-3.5 text-sm font-semibold text-[#F5F2FF] transition-all hover:bg-[rgba(255,255,255,0.10)]"
            >
              Meet the Agents
            </a>
          </motion.div>
        </div>

        {/* Chat mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative mx-auto mt-20 max-w-3xl"
        >
          {/* Floating cards — hidden on mobile */}
          <div className="hidden lg:block">
            {floatingCards.map((card) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 + card.delay }}
                className="glass absolute z-10 rounded-2xl px-4 py-3 animate-float"
                style={{
                  left: card.x,
                  top: card.y,
                  animationDelay: `${card.delay * 2}s`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6D4BFF]/20">
                    <card.icon className="h-4 w-4 text-[#B69CFF]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#B8B2D9]">{card.label}</p>
                    <p className="text-xs font-semibold text-[#F5F2FF]">{card.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main chat window */}
          <div className="glass-strong rounded-3xl p-1 glow-primary">
            <div className="rounded-[22px] bg-[#0D0820] p-6">
              {/* Agent bar */}
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#6D4BFF] to-[#D66BFF]">
                  <Heart className="h-4 w-4 text-[#F5F2FF]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F5F2FF]">Love Agent</p>
                  <p className="text-xs text-[#B8B2D9]">Relationship patterns & emotional insight</p>
                </div>
                <div className="ml-auto flex h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
              </div>

              {/* Messages */}
              <div className="space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-5 py-3">
                    <p className="text-sm leading-relaxed text-[#F5F2FF]">
                      Why do I keep attracting emotionally unavailable partners?
                    </p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-5 py-3">
                    <p className="text-sm leading-relaxed text-[#F5F2FF]/90">
                      Your chart suggests a deep need for emotional safety, but
                      also a tendency to protect vulnerability through emotional
                      control. This can create a pattern where you are drawn to
                      intense but unavailable connections.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#6D4BFF]/15 px-2.5 py-1 text-[10px] font-medium text-[#B69CFF]">
                        <Moon className="h-3 w-3" /> Moon in Capricorn
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#D66BFF]/15 px-2.5 py-1 text-[10px] font-medium text-[#D66BFF]">
                        <Heart className="h-3 w-3" /> Venus Square Saturn
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <p className="flex-1 text-sm text-[#B8B2D9]/50">
                  Ask about your chart, love, or purpose...
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF]">
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
