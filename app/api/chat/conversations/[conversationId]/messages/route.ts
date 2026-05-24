import { Timestamp } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getConversationMessagesCollection, getConversationRef } from "@/lib/firebase/firestore"
import { logError } from "@/lib/logging/logger"
import type { ConversationMessageDocument } from "@/types/conversation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function toDateIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  return null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const user = await requireUser(request)
  if (isAuthResponse(user)) return user
  const { conversationId } = await params

  if (!conversationId) {
    return errorResponse("invalid_conversation_id", "Conversation ID is required.", 400)
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get("limit") ?? "60")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 60
  const cursor = searchParams.get("cursor")

  try {
    const conversationRef = getConversationRef(user.uid, conversationId)
    const conversationSnapshot = await conversationRef.get()
    if (!conversationSnapshot.exists) {
      return errorResponse("conversation_not_found", "Conversation was not found.", 404)
    }

    let query = getConversationMessagesCollection(user.uid, conversationId)
      .orderBy("createdAt", "asc")
      .limit(limit)
    if (cursor) {
      const cursorDate = new Date(cursor)
      if (!Number.isNaN(cursorDate.valueOf())) {
        query = query.startAfter(Timestamp.fromDate(cursorDate))
      }
    }

    const snapshot = await query.get()
    const messages = snapshot.docs.map((doc) => {
      const data = doc.data() as Partial<ConversationMessageDocument>
      return {
        id: doc.id,
        role: data.role === "user" ? "user" : "assistant",
        content: data.content ?? "",
        agentType: data.agentType ?? "love",
        createdAt: toDateIso(data.createdAt),
        model: data.model ?? null,
        tokensUsed: typeof data.tokensUsed === "number" ? data.tokensUsed : null,
      }
    })

    const last = snapshot.docs[snapshot.docs.length - 1]
    const nextCursor = last ? toDateIso(last.get("createdAt")) : null

    return successResponse({
      messages,
      nextCursor,
    })
  } catch (error) {
    await logError("chat.conversations", "chat_conversation_messages_failed", {
      uid: user.uid,
      conversationId,
      error,
    })
    return errorResponse(
      "chat_conversation_messages_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to load conversation messages."
        : getErrorMessage(error),
      500
    )
  }
}
