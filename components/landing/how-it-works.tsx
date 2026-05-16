"use client"

import { motion } from "framer-motion"
import { User, Bot, MessageSquare } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: User,
    title: "Create your cosmic profile",
    description:
      "Enter your birth date, time, and location to unlock your personalized astrology blueprint.",
  },
  {
    number: "02",
    icon: Bot,
    title: "Choose your astrology AI agent",
    description:
      "Pick from six specialized agents — love, career, compatibility, daily guidance, and more.",
  },
  {
    number: "03",
    icon: MessageSquare,
    title: "Ask anything and receive guidance",
    description:
      "Start a conversation and receive personalized answers powered by real astrology data and AI.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6D4BFF]/8 blur-[120px]" />
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
            How It Works
          </span>
          <h2 className="text-3xl font-bold text-[#F5F2FF] text-balance sm:text-4xl lg:text-5xl">
            Three steps to{" "}
            <span className="text-gradient-cosmic">cosmic clarity</span>
          </h2>
        </motion.div>

        <div className="mt-20 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="group relative"
            >
              <div className="glass rounded-3xl p-8 transition-all duration-500 hover:bg-[rgba(255,255,255,0.08)] hover:shadow-lg hover:shadow-[#6D4BFF]/10">
                <span className="mb-6 block text-5xl font-bold text-[#6D4BFF]/20">
                  {step.number}
                </span>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6D4BFF]/20 to-[#D66BFF]/20 transition-all duration-500 group-hover:from-[#6D4BFF]/30 group-hover:to-[#D66BFF]/30">
                  <step.icon className="h-6 w-6 text-[#B69CFF]" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-[#F5F2FF]">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#B8B2D9]">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
