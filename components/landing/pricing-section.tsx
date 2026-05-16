"use client"

import { motion } from "framer-motion"
import { Check, Sparkles } from "lucide-react"

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Start exploring the cosmos",
    features: [
      "Basic cosmic profile",
      "Limited AI questions",
      "Daily message preview",
    ],
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Premium",
    price: "$12",
    period: "/month",
    description: "Unlock your full cosmic potential",
    features: [
      "Full AI chat access",
      "Birth chart interpretation",
      "Love and career agents",
      "Personalized daily guidance",
    ],
    cta: "Start Premium",
    featured: true,
  },
  {
    name: "Cosmic Plus",
    price: "$24",
    period: "/month",
    description: "The ultimate cosmic experience",
    features: [
      "Compatibility readings",
      "Premium reports",
      "Advanced guidance",
      "Priority access",
    ],
    cta: "Go Cosmic Plus",
    featured: false,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/4 h-[500px] w-[500px] rounded-full bg-[#6D4BFF]/8 blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/3 h-[300px] w-[300px] rounded-full bg-[#D66BFF]/6 blur-[100px]" />
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
            Pricing
          </span>
          <h2 className="text-3xl font-bold text-[#F5F2FF] text-balance sm:text-4xl lg:text-5xl">
            Choose your{" "}
            <span className="text-gradient-cosmic">cosmic plan</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#B8B2D9]">
            Start for free or unlock deeper cosmic insights with a premium plan.
          </p>
        </motion.div>

        <div className="mt-16 grid items-center gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className={`group relative ${plan.featured ? "md:-mt-4 md:mb-4" : ""}`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#D66BFF] px-4 py-1.5 text-xs font-semibold text-[#F5F2FF] shadow-lg shadow-[#6D4BFF]/30">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}
              <div
                className={`glass rounded-3xl p-8 transition-all duration-500 ${
                  plan.featured
                    ? "border border-[#6D4BFF]/30 bg-[rgba(109,75,255,0.08)] shadow-xl shadow-[#6D4BFF]/10"
                    : "hover:bg-[rgba(255,255,255,0.08)]"
                }`}
              >
                <h3 className="text-lg font-semibold text-[#F5F2FF]">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-[#B8B2D9]">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#F5F2FF]">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[#B8B2D9]">{plan.period}</span>
                </div>

                <ul className="mt-8 space-y-3.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6D4BFF]/20">
                        <Check className="h-3 w-3 text-[#B69CFF]" />
                      </div>
                      <span className="text-sm text-[#B8B2D9]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-8 w-full rounded-full py-3 text-sm font-semibold transition-all ${
                    plan.featured
                      ? "bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] text-[#F5F2FF] shadow-lg shadow-[#6D4BFF]/20 hover:shadow-xl hover:shadow-[#6D4BFF]/30"
                      : "border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] text-[#F5F2FF] hover:bg-[rgba(255,255,255,0.10)]"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
