"use client"

import { useMemo, useState } from "react"
import {
  CheckCircle2,
  CreditCard,
  HelpCircle,
  MessageSquareHeart,
  Sparkles,
  Wrench,
} from "lucide-react"

import { ApiClientError, apiFetch } from "@/lib/api/client"
import { useAuth } from "@/components/auth/auth-provider"
import { localizeApiErrorMessage } from "@/lib/i18n/api-errors"
import { useTranslations } from "@/lib/i18n/client"
import { contactTopicValues, type ContactTopic } from "@/lib/support/contact-topics"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const MESSAGE_MAX_LENGTH = 2000
const MESSAGE_MIN_LENGTH = 10

const topicIcons: Record<ContactTopic, typeof CreditCard> = {
  billing: CreditCard,
  technical: Wrench,
  profile: Sparkles,
  feedback: MessageSquareHeart,
  other: HelpCircle,
}

interface ContactSectionProps {
  userName?: string | null
}

export function ContactSection({ userName }: ContactSectionProps) {
  const { user } = useAuth()
  const userEmail = user?.email?.trim() ?? ""
  const { t, locale } = useTranslations()
  const [topic, setTopic] = useState<ContactTopic>("billing")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const trimmedMessage = message.trim()
  const canSubmit =
    Boolean(userEmail) &&
    !isSubmitting &&
    !isSuccess &&
    trimmedMessage.length >= MESSAGE_MIN_LENGTH &&
    trimmedMessage.length <= MESSAGE_MAX_LENGTH

  const replyHint = useMemo(() => {
    return t("account.contact.replyToHint").replace("{email}", userEmail)
  }, [t, userEmail])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (trimmedMessage.length < MESSAGE_MIN_LENGTH) {
      setError(t("account.contact.messageTooShort"))
      return
    }

    setIsSubmitting(true)

    try {
      await apiFetch<{ success: true; sent: boolean }>("/api/support/contact", {
        method: "POST",
        body: JSON.stringify({
          topic,
          message: trimmedMessage,
        }),
      })
      setIsSuccess(true)
      setMessage("")
    } catch (submitError) {
      if (submitError instanceof ApiClientError) {
        setError(localizeApiErrorMessage(submitError.code, locale, submitError.message))
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : locale === "ro"
              ? "A apărut o eroare."
              : "An error occurred."
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSendAnother() {
    setIsSuccess(false)
    setTopic("billing")
    setMessage("")
    setError("")
  }

  return (
    <section
      data-testid="account-contact-section"
      className="space-y-6 rounded-3xl border border-white/10 bg-[radial-gradient(140%_130%_at_10%_0%,rgba(109,75,255,0.22),rgba(10,10,20,0.92)_55%)] p-6 shadow-[0_0_80px_rgba(109,75,255,0.12)]"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("account.contact.title")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("account.contact.subtitle")}
        </p>
        {userName ? (
          <p className="mt-2 text-sm text-foreground/80">
            {userName} · {userEmail}
          </p>
        ) : (
          <p className="mt-2 text-sm text-foreground/80">{userEmail}</p>
        )}
      </div>

      {isSuccess ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div>
              <p className="font-medium text-foreground" data-testid="account-contact-success">
                {t("account.contact.success")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("account.contact.successHint")}
              </p>
              <button
                type="button"
                onClick={handleSendAnother}
                className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm text-foreground hover:bg-[rgba(255,255,255,0.05)]"
              >
                {t("account.contact.sendAnother")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              {t("account.contact.topicLabel")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {contactTopicValues.map((value) => {
                const Icon = topicIcons[value]
                const isSelected = topic === value

                return (
                  <button
                    key={value}
                    type="button"
                    data-testid={`account-contact-topic-${value}`}
                    onClick={() => setTopic(value)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition",
                      isSelected
                        ? "border-[rgba(139,92,255,0.72)] bg-[rgba(109,75,255,0.22)] ring-1 ring-[rgba(139,92,255,0.72)]"
                        : "border-white/10 bg-[rgba(255,255,255,0.03)] hover:border-white/20 hover:bg-[rgba(255,255,255,0.05)]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "rounded-xl p-2",
                          isSelected
                            ? "bg-[rgba(139,92,255,0.25)] text-violet-200"
                            : "bg-white/5 text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {t(`account.contact.topics.${value}.label`)}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {t(`account.contact.topics.${value}.description`)}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="account-contact-message" className="text-sm font-medium text-foreground">
              {t("account.contact.messageLabel")}
            </label>
            <Textarea
              id="account-contact-message"
              data-testid="account-contact-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("account.contact.messagePlaceholder")}
              maxLength={MESSAGE_MAX_LENGTH}
              rows={6}
              className="mt-2 min-h-40 border-white/10 bg-[rgba(255,255,255,0.03)]"
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{replyHint}</span>
              <span>
                {message.length}/{MESSAGE_MAX_LENGTH}
              </span>
            </div>
          </div>

          {error ? (
            <p data-testid="account-contact-error" className="text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            data-testid="account-contact-submit"
            disabled={!canSubmit}
            className="rounded-lg bg-[rgba(109,75,255,0.85)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[rgba(109,75,255,1)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? t("account.contact.submitting") : t("account.contact.submit")}
          </button>
        </form>
      )}
    </section>
  )
}
