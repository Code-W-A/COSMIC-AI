"use client"

import { motion } from "framer-motion"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useTranslations } from "@/lib/i18n/client"

const baseFaqs = [
  {
    question: "Do I need my exact birth time?",
    answer:
      "For the most accurate readings, having your exact birth time is ideal. However, Cosmic AI can still provide meaningful insights using just your birth date and location. The more precise your details, the more personalized your guidance will be.",
  },
  {
    question: "Are the readings personalized?",
    answer:
      "Yes, every reading is uniquely generated based on your birth chart data, current transits, and the specific questions you ask. No two users receive the same guidance — your cosmic blueprint is truly one of a kind.",
  },
  {
    question: "Can I ask relationship questions?",
    answer:
      "Absolutely. The Love Agent and Compatibility Agent are specifically designed to answer questions about relationships, attraction, emotional patterns, and partner compatibility. You can explore both your own love patterns and synastry with another person.",
  },
  {
    question: "What is included in the premium plan?",
    answer:
      "The Premium plan unlocks 120 AI questions per month, complete birth chart interpretation, all specialized agents (love, career, daily guidance), and personalized daily cosmic messages.",
  },
  {
    question: "How does Cosmic AI work?",
    answer:
      "Cosmic AI combines real astrology data — birth chart calculations, planetary transits, and horoscope algorithms — with advanced AI interpretation. When you ask a question, the AI analyzes your chart data and generates a personalized, conversational response grounded in astrological principles.",
  },
  {
    question: "Is this based on real astrology data?",
    answer:
      "Yes. Cosmic AI uses astronomical calculations for planetary positions, house placements, and aspects based on your birth details. This is not randomly generated — it is rooted in the same data professional astrologers use, interpreted through AI for accessibility and depth.",
  },
]

export function FAQSection() {
  const { locale } = useTranslations()
  const isRo = locale === "ro"
  const faqs = isRo
    ? [
        {
          question: "Am nevoie de ora exactă a nașterii?",
          answer:
            "Pentru cea mai mare acuratețe, ora exactă este ideală. Totuși, Cosmic AI poate oferi insight-uri utile și doar cu data și locul nașterii.",
        },
        {
          question: "Interpretările sunt personalizate?",
          answer:
            "Da. Fiecare răspuns este generat pe baza hărții tale natale, a tranzitelor curente și a întrebărilor tale specifice.",
        },
        {
          question: "Pot pune întrebări despre relații?",
          answer:
            "Da. Agenții Love și Compatibility sunt specializați pe relații, atracție, tipare emoționale și compatibilitate.",
        },
        {
          question: "Ce include planul Premium?",
          answer:
            "Premium include 120 întrebări AI/lună, interpretare completă a hărții natale, agenți specializați și mesaje zilnice personalizate.",
        },
        {
          question: "Cum funcționează Cosmic AI?",
          answer:
            "Cosmic AI combină date astrologice reale cu interpretare AI. Când întrebi ceva, AI analizează contextul tău și oferă un răspuns conversațional personalizat.",
        },
        {
          question: "Este bazat pe date astrologice reale?",
          answer:
            "Da. Sunt folosite calcule astronomice reale pentru poziții planetare, case și aspecte pe baza datelor de naștere.",
        },
      ]
    : baseFaqs
  return (
    <section id="faq" className="relative py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-1/3 left-1/3 h-[400px] w-[400px] rounded-full bg-[#6D4BFF]/6 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-[#B69CFF]">
            FAQ
          </span>
          <h2 className="text-3xl font-bold text-[#F5F2FF] text-balance sm:text-4xl lg:text-5xl">
            {isRo ? "Întrebări" : "Frequently asked"}{" "}
            <span className="text-gradient-cosmic">
              {isRo ? "frecvente" : "questions"}
            </span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="glass overflow-hidden rounded-2xl border-none px-6"
              >
                <AccordionTrigger className="py-5 text-left text-sm font-semibold text-[#F5F2FF] hover:no-underline hover:text-[#B69CFF] [&[data-state=open]>svg]:text-[#B69CFF]">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-[#B8B2D9]">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
