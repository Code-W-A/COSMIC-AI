"use client"

import { motion } from "framer-motion"
import { Globe, Calendar, Brain, MessageCircle } from "lucide-react"
import { useTranslations } from "@/lib/i18n/client"

const baseFeatures = [
  {
    icon: Globe,
    title: "Birth Chart Data",
    description: "Precise planetary positions from your exact birth details.",
  },
  {
    icon: Calendar,
    title: "Daily Horoscope Data",
    description: "Real-time transits and daily energetic influences.",
  },
  {
    icon: Brain,
    title: "AI Interpretation",
    description: "Advanced models trained to understand astrology deeply.",
  },
  {
    icon: MessageCircle,
    title: "Personalized Conversation",
    description: "Contextual guidance that remembers your chart and history.",
  },
]

export function CosmicData() {
  const { locale } = useTranslations()
  const isRo = locale === "ro"
  const features = isRo
    ? [
        {
          icon: Globe,
          title: "Date hartă natală",
          description: "Poziții planetare precise pe baza datelor tale reale de naștere.",
        },
        {
          icon: Calendar,
          title: "Date horoscop zilnic",
          description: "Tranzite în timp real și influențe energetice zilnice.",
        },
        {
          icon: Brain,
          title: "Interpretare AI",
          description: "Modele avansate antrenate pentru interpretare astrologică profundă.",
        },
        {
          icon: MessageCircle,
          title: "Conversație personalizată",
          description: "Ghidaj contextual care ține minte harta și istoricul tău.",
        },
      ]
    : baseFeatures
  return (
    <section className="relative py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#D66BFF]/8 blur-[120px]" />
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
            {isRo ? "Bazat pe date reale" : "Powered by Real Data"}
          </span>
          <h2 className="text-3xl font-bold text-[#F5F2FF] text-balance sm:text-4xl lg:text-5xl">
            {isRo ? "Susținut de" : "Powered by"}{" "}
            <span className="text-gradient-cosmic">
              {isRo ? "date cosmice" : "Cosmic Data"}
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#B8B2D9] text-pretty">
            {isRo
              ? "Cosmic AI combină date astrologice reale cu interpretare AI personalizată pentru o experiență de ghidaj spiritual mai relevantă."
              : "Cosmic AI blends real astrology data with personalized AI interpretation to create a more meaningful spiritual guidance experience."}
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group"
            >
              <div className="glass rounded-3xl p-7 text-center transition-all duration-500 hover:bg-[rgba(255,255,255,0.08)]">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6D4BFF]/20 to-[#D66BFF]/20 transition-all duration-500 group-hover:from-[#6D4BFF]/30 group-hover:to-[#D66BFF]/30">
                  <feature.icon className="h-7 w-7 text-[#B69CFF]" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-[#F5F2FF]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#B8B2D9]">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
