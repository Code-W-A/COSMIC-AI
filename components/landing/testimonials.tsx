"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"
import { useTranslations } from "@/lib/i18n/client"

const baseTestimonials = [
  {
    quote:
      "Cosmic AI gave me clarity I never found anywhere else. The Love Agent helped me understand my relationship patterns on a deeper level.",
    name: "Elena M.",
    role: "Pisces Sun, Scorpio Moon",
    stars: 5,
  },
  {
    quote:
      "I was skeptical at first, but the birth chart reading was incredibly accurate. It felt like talking to someone who truly understood me.",
    name: "James T.",
    role: "Leo Sun, Aquarius Moon",
    stars: 5,
  },
  {
    quote:
      "The Daily Guidance Agent has become part of my morning routine. Every day I get a message that genuinely resonates with where I am.",
    name: "Sofia R.",
    role: "Libra Sun, Cancer Moon",
    stars: 5,
  },
  {
    quote:
      "The compatibility reading with my partner was eye-opening. It validated so much of what we experienced and helped us communicate better.",
    name: "Alex K.",
    role: "Gemini Sun, Virgo Moon",
    stars: 5,
  },
]

export function Testimonials() {
  const { locale } = useTranslations()
  const isRo = locale === "ro"
  const testimonials = isRo
    ? [
        {
          quote:
            "Cosmic AI mi-a oferit claritate pe care nu am găsit-o în altă parte. Agentul Love m-a ajutat să înțeleg mai bine tiparele mele relaționale.",
          name: "Elena M.",
          role: "Pești Soare, Scorpion Lună",
          stars: 5,
        },
        {
          quote:
            "Eram sceptic la început, dar lectura hărții natale a fost surprinzător de precisă. A fost ca o discuție cu cineva care chiar mă înțelege.",
          name: "James T.",
          role: "Leu Soare, Vărsător Lună",
          stars: 5,
        },
        {
          quote:
            "Agentul de ghidaj zilnic a devenit parte din rutina mea de dimineață. Mesajele zilnice rezonează real cu starea mea.",
          name: "Sofia R.",
          role: "Balanță Soare, Rac Lună",
          stars: 5,
        },
        {
          quote:
            "Lectura de compatibilitate cu partenerul meu a fost revelatoare. Ne-a ajutat să înțelegem mai bine dinamica dintre noi.",
          name: "Alex K.",
          role: "Gemeni Soare, Fecioară Lună",
          stars: 5,
        },
      ]
    : baseTestimonials
  return (
    <section className="relative py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 right-1/4 h-[400px] w-[400px] rounded-full bg-[#8B5CFF]/6 blur-[120px]" />
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
            {isRo ? "Testimoniale" : "Testimonials"}
          </span>
          <h2 className="text-3xl font-bold text-[#F5F2FF] text-balance sm:text-4xl lg:text-5xl">
            {isRo ? "Iubit de" : "Loved by the"}{" "}
            <span className="text-gradient-cosmic">
              {isRo ? "comunitatea cosmică" : "cosmic community"}
            </span>
          </h2>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="glass h-full rounded-3xl p-7 transition-all duration-500 hover:bg-[rgba(255,255,255,0.08)]">
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: t.stars }).map((_, idx) => (
                    <Star
                      key={idx}
                      className="h-4 w-4 fill-[#B69CFF] text-[#B69CFF]"
                    />
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-[#F5F2FF]/85">
                  {'"'}{t.quote}{'"'}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#6D4BFF]/30 to-[#D66BFF]/30">
                    <span className="text-sm font-semibold text-[#B69CFF]">
                      {t.name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#F5F2FF]">
                      {t.name}
                    </p>
                    <p className="text-xs text-[#B8B2D9]">{t.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
