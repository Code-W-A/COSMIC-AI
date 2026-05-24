import { Timestamp } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getConversationsCollection } from "@/lib/firebase/firestore"
import { logError } from "@/lib/logging/logger"
import type { ConversationDocument } from "@/types/conversation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function toDateIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  return null
}

export async function GET(request: Request) {
  const user = await requireUser(request)
  if (isAuthResponse(user)) return user

  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get("limit") ?? "20")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20
  const cursor = searchParams.get("cursor")

  try {
    let query = getConversationsCollection(user.uid).orderBy("updatedAt", "desc").limit(limit)
    if (cursor) {
      const cursorDate = new Date(cursor)
      if (!Number.isNaN(cursorDate.valueOf())) {
        query = query.startAfter(Timestamp.fromDate(cursorDate))
      }
    }

    const snapshot = await query.get()
    const conversations = snapshot.docs.map((doc) => {
      const data = doc.data() as Partial<ConversationDocument>
      return {
        id: doc.id,
        title: data.title ?? "Conversation",
        updatedAt: toDateIso(data.updatedAt),
        createdAt: toDateIso(data.createdAt),
        lastMessagePreview: data.lastMessagePreview ?? "",
        agentType: data.agentType ?? "love",
        messageCount: typeof data.messageCount === "number" ? data.messageCount : 0,
      }
    })

    const last = snapshot.docs[snapshot.docs.length - 1]
    const nextCursor = last ? toDateIso(last.get("updatedAt")) : null

    return successResponse({
      conversations,
      nextCursor,
    })
  } catch (error) {
    await logError("chat.conversations", "chat_conversations_list_failed", {
      uid: user.uid,
      error,
    })
    return errorResponse(
      "chat_conversations_list_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to load conversations."
        : getErrorMessage(error),
      500
    )
  }
}
