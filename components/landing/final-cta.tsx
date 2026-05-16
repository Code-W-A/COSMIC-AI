"use client"

import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"

export function FinalCTA() {
  return (
    <section id="cta" className="relative py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6D4BFF]/15 blur-[150px]" />
        <div className="absolute top-1/3 right-1/3 h-[300px] w-[300px] rounded-full bg-[#D66BFF]/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="glass-strong rounded-3xl p-12 md:p-16 glow-primary">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6D4BFF] to-[#D66BFF]">
              <Sparkles className="h-8 w-8 text-[#F5F2FF]" />
            </div>

            <h2 className="text-3xl font-bold text-[#F5F2FF] text-balance sm:text-4xl lg:text-5xl">
              Start a conversation with your{" "}
              <span className="text-gradient-cosmic">cosmic AI</span> today
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#B8B2D9] text-pretty">
              Discover a more personal way to explore love, purpose,
              compatibility, and self-understanding.
            </p>

            <div className="mt-10">
              <a
                href="#"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-10 py-4 text-base font-semibold text-[#F5F2FF] transition-all hover:shadow-xl hover:shadow-[#6D4BFF]/30"
              >
                Start Free Reading
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
