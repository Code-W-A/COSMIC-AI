"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import {
  CHAT_ERROR_TRANSLATION_KEYS,
  type ChatErrorAction,
  type ChatErrorCode,
} from "@/lib/chat/errors"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"

export function ChatErrorMessage({
  errorCode,
  retryable,
  action,
  onRetry,
}: {
  errorCode: ChatErrorCode
  retryable: boolean
  action: ChatErrorAction
  onRetry?: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const localizedPath = useLocalizedPath()
  const { t } = useTranslations()
  const query = searchParams.toString()
  const returnTo = query ? `${pathname}?${query}` : pathname
  const isWarning = errorCode === "FIREBASE_SAVE_ERROR"

  const href =
    action === "login"
      ? `${localizedPath("/login")}?next=${encodeURIComponent(returnTo)}`
      : action === "onboarding"
        ? localizedPath("/onboarding")
        : action === "upgrade"
          ? localizedPath("/pricing")
          : null

  const ctaLabel =
    action === "login"
      ? t("chat.error.action.login")
      : action === "onboarding"
        ? t("chat.error.action.onboarding")
        : action === "upgrade"
          ? t("chat.error.action.upgrade")
          : null

  return (
    <div
      data-testid={isWarning ? "chat-save-warning" : "chat-error-message"}
      className={`rounded-2xl border px-4 py-3 ${
        isWarning
          ? "border-amber-300/20 bg-amber-300/5 text-amber-100/80"
          : "border-fuchsia-300/15 bg-fuchsia-300/5 text-foreground"
      }`}
      role={isWarning ? "status" : "alert"}
    >
      <p className="text-sm leading-relaxed">{t(CHAT_ERROR_TRANSLATION_KEYS[errorCode])}</p>
      {(href && ctaLabel) || (retryable && action === "retry" && onRetry) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {href && ctaLabel ? (
            <Link
              href={href}
              data-testid={`chat-error-action-${action}`}
              className="rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-4 py-2 text-xs font-semibold text-foreground"
            >
              {ctaLabel}
            </Link>
          ) : null}
          {retryable && action === "retry" && onRetry ? (
            <button
              type="button"
              data-testid="chat-retry-button"
              onClick={onRetry}
              className="rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-4 py-2 text-xs font-semibold text-foreground"
            >
              {t("chat.error.action.retry")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
