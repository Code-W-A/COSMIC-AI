import { Suspense } from "react"

import { BillingSetupClientPage } from "./setup-client"

export default function BillingSetupPage() {
  return (
    <Suspense fallback={null}>
      <BillingSetupClientPage />
    </Suspense>
  )
}
