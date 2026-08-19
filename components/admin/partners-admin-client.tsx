"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { ApiClientError, apiFetch } from "@/lib/api/client"
import { useTranslations } from "@/lib/i18n/client"
import { suggestReferralCode } from "@/lib/partners/codes"
import type {
  AdminUserOption,
  PartnerAdminSummary,
  ReferralConversionDocument,
} from "@/lib/partners/types"

type PartnersResponse = {
  success: true
  partners: PartnerAdminSummary[]
  conversions: ReferralConversionDocument[]
}

type UsersResponse = {
  success: true
  users: AdminUserOption[]
}

function formatAmount(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-US", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 2,
  }).format(amount / 100)
}

export function PartnersAdminClient() {
  const { t, locale } = useTranslations()
  const [partners, setPartners] = useState<PartnerAdminSummary[]>([])
  const [conversions, setConversions] = useState<ReferralConversionDocument[]>([])
  const [accounts, setAccounts] = useState<AdminUserOption[]>([])
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [accountQuery, setAccountQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")
  const [form, setForm] = useState({
    uid: "",
    code: "",
    name: "",
    email: "",
    commissionPercent: "20",
    discountPercent: "20",
  })

  async function loadPartners(code?: string | null) {
    const query = code ? `?code=${encodeURIComponent(code)}` : ""
    const payload = await apiFetch<PartnersResponse>(`/api/admin/partners${query}`)
    setPartners(payload.partners)
    setConversions(payload.conversions)
    setSelectedCode(code ?? null)
  }

  async function loadAccounts(query: string) {
    setSearching(true)
    try {
      const payload = await apiFetch<UsersResponse>(
        `/api/admin/users?q=${encodeURIComponent(query.trim())}`
      )
      setAccounts(payload.users)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      loadPartners().catch((loadError) => {
        if (cancelled) return
        setError(
          loadError instanceof ApiClientError && loadError.status === 403
            ? t("admin.partners.forbidden")
            : t("admin.partners.loadFailed")
        )
      }),
      loadAccounts("").catch(() => {
        if (!cancelled) setAccounts([])
      }),
    ]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [t])

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.code === selectedCode) ?? null,
    [partners, selectedCode]
  )

  function selectAccount(account: AdminUserOption) {
    const existing = partners.find(
      (partner) => partner.uid === account.uid || partner.email === account.email.toLowerCase()
    )
    setForm({
      uid: account.uid,
      email: account.email,
      name: account.displayName || account.email.split("@")[0] || account.email,
      code: existing?.code || suggestReferralCode({ email: account.email, name: account.displayName }),
      commissionPercent: String(existing?.commissionPercent ?? 20),
      discountPercent: String(existing?.discountPercent ?? 20),
    })
    if (existing) {
      void loadPartners(existing.code)
    }
  }

  function selectPartner(partner: PartnerAdminSummary) {
    setForm({
      uid: partner.uid ?? "",
      email: partner.email,
      name: partner.name,
      code: partner.code,
      commissionPercent: String(partner.commissionPercent ?? 20),
      discountPercent: String(partner.discountPercent ?? 20),
    })
    void loadPartners(partner.code)
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(url)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      await apiFetch("/api/admin/partners", {
        method: "POST",
        body: {
          uid: form.uid || null,
          code: form.code,
          name: form.name,
          email: form.email,
          commissionPercent: Number(form.commissionPercent),
          discountPercent: Number(form.discountPercent),
          grantPremium: true,
        },
      })
      await Promise.all([loadPartners(form.code.trim().toLowerCase()), loadAccounts(accountQuery)])
    } catch {
      setError(t("admin.partners.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-background px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-foreground">{t("admin.partners.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("admin.partners.subtitle")}</p>

          {error ? (
            <p className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-8 text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <div className="mt-10 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
              <section className="overflow-x-auto rounded-3xl border border-border bg-[#0D0820]/70">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">{t("admin.partners.col.partner")}</th>
                      <th className="px-4 py-3">{t("admin.partners.col.discount")}</th>
                      <th className="px-4 py-3">{t("admin.partners.col.link")}</th>
                      <th className="px-4 py-3">{t("admin.partners.col.signups")}</th>
                      <th className="px-4 py-3">{t("admin.partners.col.paid")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                          {t("admin.partners.empty")}
                        </td>
                      </tr>
                    ) : (
                      partners.map((partner) => (
                        <tr
                          key={partner.code}
                          className={`border-b border-border/60 text-foreground last:border-0 ${
                          selectedCode === partner.code ? "bg-white/5" : ""
                        }`}
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => selectPartner(partner)}
                              className="text-left font-medium text-cosmic-lavender hover:text-foreground"
                            >
                              {partner.name}
                            </button>
                            <p className="text-xs text-muted-foreground">{partner.email}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold">{partner.discountPercent}%</td>
                          <td className="px-4 py-3">
                            <p className="max-w-[260px] break-all text-xs text-muted-foreground">
                              {partner.shareUrl}
                            </p>
                            <button
                              type="button"
                              onClick={() => void handleCopy(partner.shareUrl)}
                              className="mt-2 rounded-full border border-border px-3 py-1 text-xs hover:bg-white/5"
                            >
                              {copied === partner.shareUrl
                                ? t("admin.partners.copied")
                                : t("admin.partners.copyLink")}
                            </button>
                          </td>
                          <td className="px-4 py-3">{partner.signupCount}</td>
                          <td className="px-4 py-3">{partner.paidCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>

              <div className="space-y-8">
                <section className="rounded-3xl border border-border bg-[#0D0820]/70 p-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("admin.partners.selectAccount")}
                  </h2>
                  <form
                    className="mt-4 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void loadAccounts(accountQuery)
                    }}
                  >
                    <input
                      value={accountQuery}
                      onChange={(event) => setAccountQuery(event.target.value)}
                      placeholder={t("admin.partners.searchPlaceholder")}
                      className="flex-1 rounded-xl border border-border bg-transparent px-4 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-white/5"
                    >
                      {searching ? t("common.loading") : t("admin.partners.search")}
                    </button>
                  </form>
                  <ul className="mt-4 max-h-56 space-y-2 overflow-auto text-sm">
                    {accounts.length === 0 ? (
                      <li className="text-muted-foreground">{t("admin.partners.noAccounts")}</li>
                    ) : (
                      accounts.map((account) => (
                        <li key={account.uid}>
                          <button
                            type="button"
                            onClick={() => selectAccount(account)}
                            className="w-full rounded-xl border border-border px-3 py-2 text-left hover:bg-white/5"
                          >
                            <span className="block font-medium text-foreground">
                              {account.displayName || account.email}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {account.email}
                              {account.alreadyPartner
                                ? ` · ${t("admin.partners.alreadyPartner")} (${account.partnerCode})`
                                : ""}
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </section>

                <form
                  onSubmit={handleSave}
                  className="rounded-3xl border border-border bg-[#0D0820]/70 p-6"
                >
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("admin.partners.addTitle")}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {form.email
                      ? t("admin.partners.selectedAccount").replace("{email}", form.email)
                      : t("admin.partners.selectHint")}
                  </p>
                  <div className="mt-4 space-y-3">
                    <input
                      required
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder={t("admin.partners.field.name")}
                      className="w-full rounded-xl border border-border bg-transparent px-4 py-2 text-sm"
                    />
                    <input
                      required
                      value={form.code}
                      onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                      placeholder={t("admin.partners.field.code")}
                      className="w-full rounded-xl border border-border bg-transparent px-4 py-2 text-sm"
                    />
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder={t("admin.partners.field.email")}
                      className="w-full rounded-xl border border-border bg-transparent px-4 py-2 text-sm"
                    />
                    <label className="block text-xs text-muted-foreground">
                      {t("admin.partners.field.discount")}
                      <input
                        required
                        type="number"
                        min={1}
                        max={100}
                        value={form.discountPercent}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, discountPercent: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-border bg-transparent px-4 py-2 text-sm text-foreground"
                      />
                    </label>
                    <label className="block text-xs text-muted-foreground">
                      {t("admin.partners.field.commission")}
                      <input
                        required
                        type="number"
                        min={0}
                        max={100}
                        value={form.commissionPercent}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, commissionPercent: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-border bg-transparent px-4 py-2 text-sm text-foreground"
                      />
                    </label>
                  </div>
                  {form.code ? (
                    <p className="mt-3 break-all text-xs text-cosmic-lavender">
                      {typeof window !== "undefined" ? window.location.origin : "https://www.astro-ai.ro"}
                      /r/{form.code.toLowerCase()}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={saving || !form.email}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {saving ? t("auth.pleaseWait") : t("admin.partners.save")}
                  </button>
                </form>

                {selectedPartner ? (
                  <section className="rounded-3xl border border-border bg-[#0D0820]/70 p-6">
                    <h2 className="text-lg font-semibold text-foreground">
                      {selectedPartner.name}
                    </h2>
                    <p className="mt-1 text-sm text-foreground">
                      {t("admin.partners.col.discount")}: {selectedPartner.discountPercent}%
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {selectedPartner.shareUrl}
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {conversions.length === 0 ? (
                        <li>{t("admin.partners.noConversions")}</li>
                      ) : (
                        conversions.map((conversion, index) => (
                          <li key={`${conversion.type}-${conversion.uid}-${index}`}>
                            {conversion.type === "signup"
                              ? t("admin.partners.conversion.signup")
                              : t("admin.partners.conversion.paid")}
                            {" · "}
                            {conversion.email || conversion.uid}
                            {typeof conversion.amountPaid === "number"
                              ? ` · ${formatAmount(conversion.amountPaid, locale)}`
                              : ""}
                          </li>
                        ))
                      )}
                    </ul>
                  </section>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  )
}
