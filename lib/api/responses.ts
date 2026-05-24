import { NextResponse } from "next/server"

export interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
  }
}

export function successResponse<T extends Record<string, unknown>>(
  data?: T,
  status = 200
) {
  return NextResponse.json({ success: true, ...(data ?? {}) }, { status })
}

export function errorResponse(code: string, message: string, status = 500) {
  return NextResponse.json<ApiErrorBody>(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status }
  )
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Unknown error"
}
