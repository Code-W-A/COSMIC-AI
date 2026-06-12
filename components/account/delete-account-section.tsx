"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { PasswordInput } from "@/components/auth/password-input"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteAccount } from "@/lib/firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { localizeApiErrorMessage } from "@/lib/i18n/api-errors"
import { localizeFirebaseAuthError } from "@/lib/i18n/firebase-auth-errors"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"
import { ApiClientError } from "@/lib/api/client"

interface DeleteAccountSectionProps {
  isPremiumBlocked: boolean
  onDeleted: () => void
}

type DeleteDialogStep = "confirm" | "reauth"

export function DeleteAccountSection({
  isPremiumBlocked,
  onDeleted,
}: DeleteAccountSectionProps) {
  const localizedPath = useLocalizedPath()
  const { t, locale } = useTranslations()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [step, setStep] = useState<DeleteDialogStep>("confirm")
  const [password, setPassword] = useState("")
  const [acknowledged, setAcknowledged] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  const authUser = getFirebaseAuth().currentUser

  const requiresPassword = useMemo(() => {
    return authUser?.providerData.some((provider) => provider.providerId === "password") ?? false
  }, [authUser])

  const canContinue = acknowledged && !isDeleting
  const canDelete =
    !isDeleting && (!requiresPassword || password.trim().length > 0)

  function resetDialogState() {
    setStep("confirm")
    setPassword("")
    setAcknowledged(false)
    setError("")
    setIsDeleting(false)
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      resetDialogState()
    }
  }

  async function handleDelete() {
    setError("")
    setIsDeleting(true)

    try {
      await deleteAccount({
        password: requiresPassword ? password : undefined,
      })
      handleDialogOpenChange(false)
      onDeleted()
    } catch (deleteError) {
      if (deleteError instanceof ApiClientError) {
        setError(localizeApiErrorMessage(deleteError.code, locale, deleteError.message))
      } else {
        setError(localizeFirebaseAuthError(deleteError, locale))
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section
      data-testid="account-delete-section"
      className="space-y-4 rounded-3xl border border-red-500/25 bg-[radial-gradient(120%_120%_at_30%_0%,rgba(220,38,38,0.12),rgba(10,10,20,0.94)_62%)] p-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("account.delete.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("account.delete.subtitle")}</p>
        <p className="mt-3 text-sm text-red-200/90">{t("account.delete.warning")}</p>
      </div>

      {isPremiumBlocked ? (
        <div
          data-testid="account-delete-blocked"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4"
        >
          <p className="text-sm text-amber-100">{t("account.delete.activeSubscriptionBlocked")}</p>
          <Link
            href={localizedPath("/account/subscription")}
            data-testid="account-delete-go-billing"
            className="mt-3 inline-flex rounded-lg border border-white/20 px-4 py-2 text-sm text-foreground hover:bg-white/5"
          >
            {t("account.delete.goToBilling")}
          </Link>
        </div>
      ) : (
        <button
          type="button"
          data-testid="account-delete-open"
          onClick={() => setDialogOpen(true)}
          className="rounded-xl border border-red-500/40 bg-red-500/15 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/25"
        >
          {t("account.delete.openDialog")}
        </button>
      )}

      <AlertDialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <AlertDialogContent
          data-testid="account-delete-dialog"
          className="border-red-500/20 bg-[#0c0c16] text-foreground"
        >
          {step === "confirm" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("account.delete.dialogTitle")}</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  {t("account.delete.dialogDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <label className="flex items-start gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  data-testid="account-delete-acknowledge"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  className="mt-1"
                />
                <span>{t("account.delete.acknowledgeLabel")}</span>
              </label>

              <AlertDialogFooter>
                <AlertDialogCancel data-testid="account-delete-cancel">
                  {t("account.delete.cancel")}
                </AlertDialogCancel>
                <button
                  type="button"
                  data-testid="account-delete-continue"
                  disabled={!canContinue}
                  onClick={() => setStep("reauth")}
                  className="rounded-md border border-red-500/40 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("account.delete.continue")}
                </button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("account.delete.reauthTitle")}</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  {requiresPassword
                    ? t("account.delete.reauthPasswordDescription")
                    : t("account.delete.reauthGoogleDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>

              {requiresPassword && (
                <PasswordInput
                  label={t("account.delete.passwordLabel")}
                  value={password}
                  onChange={setPassword}
                  placeholder={t("auth.placeholder.password")}
                  testId="account-delete-password"
                  showLabel={t("auth.password.show")}
                  hideLabel={t("auth.password.hide")}
                  autoComplete="current-password"
                />
              )}

              {error && (
                <p data-testid="account-delete-error" className="text-sm text-red-200">
                  {error}
                </p>
              )}

              <AlertDialogFooter>
                <button
                  type="button"
                  data-testid="account-delete-back"
                  disabled={isDeleting}
                  onClick={() => {
                    setError("")
                    setStep("confirm")
                  }}
                  className="rounded-md border border-white/15 px-4 py-2 text-sm text-foreground transition hover:bg-white/5 disabled:opacity-50"
                >
                  {t("account.delete.back")}
                </button>
                <button
                  type="button"
                  data-testid="account-delete-submit"
                  disabled={!canDelete}
                  onClick={() => void handleDelete()}
                  className="rounded-md border border-red-500/40 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? t("account.delete.deleting") : t("account.delete.submit")}
                </button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
