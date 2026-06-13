import type { Locale } from "@/lib/i18n/locale"

export const CHAT_ERROR_CODES = [
  "AUTH_REQUIRED",
  "ONBOARDING_REQUIRED",
  "USAGE_LIMIT_REACHED",
  "PREMIUM_REQUIRED",
  "MESSAGE_TOO_LONG",
  "EMPTY_MESSAGE",
  "OPENAI_TIMEOUT",
  "OPENAI_UNAVAILABLE",
  "NETWORK_ERROR",
  "FIREBASE_SAVE_ERROR",
  "STRIPE_REQUIRED",
  "UNKNOWN_ERROR",
] as const

export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number]
export type ChatErrorAction = "retry" | "login" | "onboarding" | "upgrade" | "none"

export interface ChatApiError {
  code: ChatErrorCode
  message: string
  retryable: boolean
  action: ChatErrorAction
}

type ChatErrorDefinition = {
  retryable: boolean
  action: ChatErrorAction
  messages: Record<Locale, string>
}

export const CHAT_ERROR_DEFINITIONS: Record<ChatErrorCode, ChatErrorDefinition> = {
  AUTH_REQUIRED: {
    retryable: false,
    action: "login",
    messages: {
      ro: "Conectează-te pentru a continua conversația.",
      en: "Sign in to continue the conversation.",
    },
  },
  ONBOARDING_REQUIRED: {
    retryable: false,
    action: "onboarding",
    messages: {
      ro: "Completează profilul astrologic pentru răspunsuri personalizate.",
      en: "Complete your astrology profile for personalized answers.",
    },
  },
  USAGE_LIMIT_REACHED: {
    retryable: false,
    action: "upgrade",
    messages: {
      ro: "Ai folosit întrebările gratuite. Activează Premium pentru a continua.",
      en: "You have used your free questions. Activate Premium to continue.",
    },
  },
  PREMIUM_REQUIRED: {
    retryable: false,
    action: "upgrade",
    messages: {
      ro: "Această conversație este disponibilă pentru utilizatorii Premium.",
      en: "This conversation is available to Premium users.",
    },
  },
  MESSAGE_TOO_LONG: {
    retryable: false,
    action: "none",
    messages: {
      ro: "Mesajul este prea lung. Încearcă să îl reformulezi mai scurt.",
      en: "The message is too long. Try rewriting it more briefly.",
    },
  },
  EMPTY_MESSAGE: {
    retryable: false,
    action: "none",
    messages: {
      ro: "Scrie o întrebare înainte de a trimite.",
      en: "Write a question before sending.",
    },
  },
  OPENAI_TIMEOUT: {
    retryable: true,
    action: "retry",
    messages: {
      ro: "Răspunsul a durat prea mult. Poți încerca din nou.",
      en: "The response took too long. You can try again.",
    },
  },
  OPENAI_UNAVAILABLE: {
    retryable: true,
    action: "retry",
    messages: {
      ro: "AstroAI nu poate răspunde momentan. Încearcă din nou în câteva secunde.",
      en: "AstroAI cannot respond right now. Try again in a few seconds.",
    },
  },
  NETWORK_ERROR: {
    retryable: true,
    action: "retry",
    messages: {
      ro: "Conexiunea pare instabilă. Mesajul tău nu a fost pierdut.",
      en: "The connection seems unstable. Your message was not lost.",
    },
  },
  FIREBASE_SAVE_ERROR: {
    retryable: false,
    action: "none",
    messages: {
      ro: "Răspunsul a fost generat, dar este posibil să nu fi fost salvat corect.",
      en: "The response was generated, but it may not have been saved correctly.",
    },
  },
  STRIPE_REQUIRED: {
    retryable: false,
    action: "upgrade",
    messages: {
      ro: "Finalizează activarea Premium pentru a continua.",
      en: "Complete Premium activation to continue.",
    },
  },
  UNKNOWN_ERROR: {
    retryable: true,
    action: "retry",
    messages: {
      ro: "A apărut o problemă. Te rugăm să încerci din nou.",
      en: "Something went wrong. Please try again.",
    },
  },
}

export function isChatErrorCode(value: unknown): value is ChatErrorCode {
  return typeof value === "string" && CHAT_ERROR_CODES.includes(value as ChatErrorCode)
}

export function isChatErrorAction(value: unknown): value is ChatErrorAction {
  return ["retry", "login", "onboarding", "upgrade", "none"].includes(
    value as ChatErrorAction
  )
}

export function createChatError(
  code: ChatErrorCode,
  locale: Locale,
  overrides: Partial<Pick<ChatApiError, "retryable" | "action">> = {}
): ChatApiError {
  const definition = CHAT_ERROR_DEFINITIONS[code]
  return {
    code,
    message: definition.messages[locale],
    retryable: overrides.retryable ?? definition.retryable,
    action: overrides.action ?? definition.action,
  }
}

export function classifyChatException(
  error: unknown,
  source: "generation" | "persistence" = "generation"
): ChatErrorCode {
  if (source === "persistence") return "FIREBASE_SAVE_ERROR"
  if (!(error instanceof Error)) return "UNKNOWN_ERROR"

  if (error.name === "APIConnectionTimeoutError") return "OPENAI_TIMEOUT"
  if (error.name === "APIConnectionError") return "OPENAI_UNAVAILABLE"

  const status = "status" in error && typeof error.status === "number" ? error.status : null
  if (status === 408 || status === 504) return "OPENAI_TIMEOUT"
  if (status === 429 || (status !== null && status >= 500)) return "OPENAI_UNAVAILABLE"

  return "UNKNOWN_ERROR"
}

export const CHAT_ERROR_TRANSLATION_KEYS: Record<ChatErrorCode, string> = {
  AUTH_REQUIRED: "chat.error.AUTH_REQUIRED",
  ONBOARDING_REQUIRED: "chat.error.ONBOARDING_REQUIRED",
  USAGE_LIMIT_REACHED: "chat.error.USAGE_LIMIT_REACHED",
  PREMIUM_REQUIRED: "chat.error.PREMIUM_REQUIRED",
  MESSAGE_TOO_LONG: "chat.error.MESSAGE_TOO_LONG",
  EMPTY_MESSAGE: "chat.error.EMPTY_MESSAGE",
  OPENAI_TIMEOUT: "chat.error.OPENAI_TIMEOUT",
  OPENAI_UNAVAILABLE: "chat.error.OPENAI_UNAVAILABLE",
  NETWORK_ERROR: "chat.error.NETWORK_ERROR",
  FIREBASE_SAVE_ERROR: "chat.error.FIREBASE_SAVE_ERROR",
  STRIPE_REQUIRED: "chat.error.STRIPE_REQUIRED",
  UNKNOWN_ERROR: "chat.error.UNKNOWN_ERROR",
}
