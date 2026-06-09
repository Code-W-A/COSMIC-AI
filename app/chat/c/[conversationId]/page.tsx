"use client"

import { useParams } from "next/navigation"

import { ChatPageClient } from "@/components/chat/chat-page-client"

export default function ChatConversationPage() {
  const params = useParams<{ conversationId: string }>()
  const conversationId = typeof params.conversationId === "string" ? params.conversationId : null

  return <ChatPageClient conversationIdFromUrl={conversationId} />
}
