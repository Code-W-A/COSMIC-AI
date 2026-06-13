import "server-only"

import { NextResponse } from "next/server"

import { createChatError, type ChatErrorCode } from "@/lib/chat/errors"
import type { Locale } from "@/lib/i18n/locale"

export function chatErrorResponse(code: ChatErrorCode, locale: Locale, status: number) {
  return NextResponse.json(
    {
      ok: false as const,
      error: createChatError(code, locale),
    },
    { status }
  )
}
