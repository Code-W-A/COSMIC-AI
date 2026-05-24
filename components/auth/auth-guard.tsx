"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { useCurrentLocale, useTranslations } from "@/lib/i18n/client"

function CosmicAuthLoading() {
  const { t } = useTranslations()

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(109,75,255,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_45%)]" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(245,242,255,0.55) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative mb-7 flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#B69CFF]/20 shadow-[0_0_60px_rgba(109,75,255,0.28)]" />
          <div className="absolute inset-3 animate-[spin_8s_linear_infinite] rounded-full border border-transparent border-t-[#B69CFF] border-r-[#D66BFF]/70" />
          <div className="absolute inset-7 animate-[spin_5s_linear_infinite_reverse] rounded-full border border-transparent border-b-[#8B5CFF] border-l-[#B69CFF]/60" />

          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-[#F5F2FF] shadow-[0_0_16px_rgba(245,242,255,0.9)]" />
          <span className="absolute right-4 top-5 h-1.5 w-1.5 rounded-full bg-[#D66BFF] shadow-[0_0_14px_rgba(214,107,255,0.85)]" />
          <span className="absolute bottom-4 left-5 h-1.5 w-1.5 rounded-full bg-[#8B5CFF] shadow-[0_0_14px_rgba(139,92,255,0.85)]" />

          <div className="relative flex h-16 w-16 animate-[pulse_2.4s_ease-in-out_infinite] items-center justify-center rounded-2xl border border-[#B69CFF]/20 bg-[rgba(255,255,255,0.06)] shadow-[0_0_38px_rgba(109,75,255,0.35)] backdrop-blur-xl">
            <Sparkles className="h-7 w-7 text-[#DCD3FF]" />
          </div>
        </div>

        <p className="bg-gradient-to-r from-[#F5F2FF] via-[#B69CFF] to-[#F5F2FF] bg-[length:200%_100%] bg-clip-text text-base font-semibold text-transparent animate-[cosmic-shimmer_2.6s_linear_infinite]">
          {t("auth.loading.title")}
        </p>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
          {t("auth.loading.subtitle")}
        </p>

        <div className="mt-7 h-1 w-44 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
          <div className="h-full w-1/2 animate-[cosmic-progress_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-[#B69CFF] to-transparent" />
        </div>
      </div>

      <style jsx>{`
        @keyframes cosmic-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @keyframes cosmic-progress {
          0% {
            transform: translateX(-110%);
          }
          100% {
            transform: translateX(220%);
          }
        }
      `}</style>
    </div>
  )
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const locale = useCurrentLocale()

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/${locale}/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [loading, locale, pathname, router, user])

  if (loading || !user) {
    return <CosmicAuthLoading />
  }

  return <>{children}</>
}
