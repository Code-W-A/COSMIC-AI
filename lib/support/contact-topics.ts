export const contactTopicValues = [
  "billing",
  "technical",
  "profile",
  "feedback",
  "other",
] as const

export type ContactTopic = (typeof contactTopicValues)[number]

export function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === "string" && contactTopicValues.includes(value as ContactTopic)
}

export function getContactTopicLabel(topic: ContactTopic, locale: "en" | "ro") {
  const labels: Record<ContactTopic, Record<"en" | "ro", string>> = {
    billing: {
      en: "Billing & subscription",
      ro: "Facturare & abonament",
    },
    technical: {
      en: "Technical issue",
      ro: "Problemă tehnică",
    },
    profile: {
      en: "Cosmic profile / readings",
      ro: "Profil cosmic / analize",
    },
    feedback: {
      en: "Feedback & suggestions",
      ro: "Feedback & sugestii",
    },
    other: {
      en: "Other",
      ro: "Altceva",
    },
  }

  return labels[topic][locale]
}
