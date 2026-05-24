import type { AgentType } from "./agent"
import type { FirestoreTimestampLike } from "./user"

export interface ConversationDocument {
  title: string
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
  lastMessagePreview: string
  agentType: AgentType
  messageCount: number
  archived?: boolean
}

export interface ConversationMessageDocument {
  role: "user" | "assistant"
  content: string
  agentType: AgentType
  createdAt: FirestoreTimestampLike
  model?: string | null
  tokensUsed?: number | null
}
