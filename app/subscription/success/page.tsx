import { Suspense } from "react"

import { SubscriptionSuccessClientPage } from "./success-client"

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionSuccessClientPage />
    </Suspense>
  )
}
