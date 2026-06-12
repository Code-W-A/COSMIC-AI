import { Suspense } from "react"

import { ChatPageClient } from "@/components/chat/chat-page-client"

export default function AskPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageClient />
    </Suspense>
  )
}
