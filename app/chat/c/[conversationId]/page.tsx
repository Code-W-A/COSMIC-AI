"use client"

import { Suspense } from "react"
import { useParams } from "next/navigation"

import { ChatPageClient } from "@/components/chat/chat-page-client"

function ChatConversationPageContent() {
  const params = useParams<{ conversationId: string }>()
  const conversationId = typeof params.conversationId === "string" ? params.conversationId : null

  return <ChatPageClient conversationIdFromUrl={conversationId} />
}

export default function ChatConversationPage() {
  return (
    <Suspense fallback={null}>
      <ChatConversationPageContent />
    </Suspense>
  )
}
