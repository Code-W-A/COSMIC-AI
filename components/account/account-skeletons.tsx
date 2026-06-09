import { Skeleton } from "@/components/ui/skeleton"

function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={className ?? "h-3 w-full bg-white/10"} />
}

export function AccountHeroNameSkeleton() {
  return (
    <Skeleton
      data-testid="account-hero-name-skeleton"
      className="inline-block h-7 w-40 align-middle bg-white/10"
    />
  )
}

export function AccountHeroPlanSkeleton() {
  return (
    <div data-testid="account-hero-plan-skeleton" className="mt-2 space-y-2">
      <Skeleton className="h-6 w-32 bg-white/10" />
      <Skeleton className="h-3 w-40 bg-white/10" />
    </div>
  )
}

export function AccountHeroFocusSkeleton() {
  return (
    <div data-testid="account-hero-focus-skeleton" className="mt-2 space-y-2">
      <Skeleton className="h-6 w-28 bg-white/10" />
      <Skeleton className="h-3 w-36 bg-white/10" />
    </div>
  )
}

export function AccountLastReadingSkeleton() {
  return (
    <div data-testid="account-last-reading-skeleton" className="mt-2 space-y-2">
      <SkeletonLine className="h-4 w-4/5 bg-white/10" />
      <SkeletonLine className="h-3 w-full bg-white/10" />
      <SkeletonLine className="h-3 w-1/3 bg-white/10" />
    </div>
  )
}

export function AccountInsightsSkeleton() {
  return (
    <div data-testid="account-insights-skeleton" className="mt-4 space-y-4">
      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
        <Skeleton className="h-5 w-40 bg-white/10" />
        <Skeleton className="mt-3 h-4 w-full max-w-md bg-white/10" />
      </div>
      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
        <Skeleton className="h-4 w-32 bg-white/10" />
        <Skeleton className="mt-3 h-64 w-full rounded-xl bg-white/10" />
      </div>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-white/10 bg-black/25 p-4"
        >
          <Skeleton className="h-4 w-36 bg-white/10" />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-14 rounded-lg bg-white/10" />
            <Skeleton className="h-14 rounded-lg bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AccountReadingsListSkeleton() {
  return (
    <div data-testid="account-readings-list-skeleton" className="mt-4 grid gap-3">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-white/10 bg-black/25 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-3/5 bg-white/10" />
            <Skeleton className="h-3 w-20 bg-white/10" />
          </div>
          <Skeleton className="mt-2 h-3 w-full bg-white/10" />
          <Skeleton className="mt-1.5 h-3 w-4/5 bg-white/10" />
        </div>
      ))}
    </div>
  )
}

export function AccountProfileFormSkeleton() {
  return (
    <div
      data-testid="account-profile-form-skeleton"
      className="mt-4 grid gap-4 sm:grid-cols-2"
    >
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className={item >= 4 ? "sm:col-span-2" : undefined}>
          <Skeleton className="h-3 w-24 bg-white/10" />
          <Skeleton className="mt-2 h-10 w-full rounded-lg bg-white/10" />
        </div>
      ))}
      <div className="sm:col-span-2">
        <Skeleton className="h-10 w-32 rounded-lg bg-white/10" />
      </div>
    </div>
  )
}

export function AccountDailySkeleton() {
  return (
    <div data-testid="account-daily-skeleton" className="space-y-4">
      <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <Skeleton className="h-3 w-28 bg-white/10" />
        <Skeleton className="mt-3 h-4 w-full bg-white/10" />
        <Skeleton className="mt-2 h-4 w-full bg-white/10" />
        <Skeleton className="mt-2 h-4 w-3/4 bg-white/10" />
        <Skeleton className="mt-3 h-3 w-48 bg-white/10" />
      </article>
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <article
            key={item}
            className="rounded-2xl border border-white/10 bg-black/25 p-4"
          >
            <Skeleton className="h-3 w-24 bg-white/10" />
            <Skeleton className="mt-2 h-4 w-full bg-white/10" />
          </article>
        ))}
      </div>
    </div>
  )
}

export function AccountCompatibilitySkeleton() {
  return (
    <div data-testid="account-compatibility-skeleton" className="space-y-4">
      <article className="rounded-2xl border border-violet-300/20 bg-black/30 p-5">
        <Skeleton className="h-5 w-56 bg-white/10" />
        <Skeleton className="mt-3 h-3 w-32 bg-white/10" />
        <Skeleton className="mt-3 h-4 w-full bg-white/10" />
        <Skeleton className="mt-2 h-4 w-4/5 bg-white/10" />
      </article>
      <div className="rounded-2xl border border-violet-300/20 bg-black/25 p-5">
        <Skeleton className="h-4 w-40 bg-white/10" />
        <Skeleton className="mt-4 h-10 w-full rounded-xl bg-white/10" />
        <Skeleton className="mt-4 h-24 w-full rounded-xl bg-white/10" />
        <Skeleton className="mt-4 h-10 w-full rounded-xl bg-white/10" />
      </div>
    </div>
  )
}

export function AccountBillingSkeleton() {
  return (
    <div
      data-testid="account-billing-skeleton"
      className="grid gap-3 md:grid-cols-2"
    >
      <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <Skeleton className="h-3 w-28 bg-white/10" />
        <Skeleton className="mt-2 h-6 w-36 bg-white/10" />
        <Skeleton className="mt-2 h-3 w-44 bg-white/10" />
      </article>
      <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <Skeleton className="h-3 w-32 bg-white/10" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-36 rounded-lg bg-white/10" />
          <Skeleton className="h-9 w-40 rounded-lg bg-white/10" />
        </div>
      </article>
    </div>
  )
}
