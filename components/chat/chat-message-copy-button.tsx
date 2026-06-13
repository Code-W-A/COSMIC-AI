"use client"

import { useState } from "react"
import { Copy } from "lucide-react"
import { toast } from "sonner"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslations } from "@/lib/i18n/client"

interface ChatMessageCopyButtonProps {
  content: string
  align?: "left" | "right"
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()

  const copied = document.execCommand("copy")
  document.body.removeChild(textarea)

  if (!copied) {
    throw new Error("clipboard_unavailable")
  }
}

export function ChatMessageCopyButton({
  content,
  align = "right",
}: ChatMessageCopyButtonProps) {
  const { t } = useTranslations()
  const [isCopying, setIsCopying] = useState(false)

  async function handleCopy() {
    if (!content.trim() || isCopying) return

    setIsCopying(true)
    try {
      await copyTextToClipboard(content)
      toast.success(t("chat.copy.success"))
    } catch {
      toast.error(t("chat.copy.failed"))
    } finally {
      setIsCopying(false)
    }
  }

  const positionClass =
    align === "left" ? "left-2 top-2" : "right-2 top-2"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-testid="chat-message-copy"
          aria-label={t("chat.copy.action")}
          disabled={isCopying}
          onClick={() => void handleCopy()}
          className={`absolute ${positionClass} z-10 inline-flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(255,255,255,0.1)] bg-[rgba(7,3,17,0.75)] text-muted-foreground backdrop-blur-sm transition-all hover:border-[rgba(109,75,255,0.35)] hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D4BFF]/50 disabled:opacity-40 max-sm:opacity-80 sm:opacity-0 sm:group-hover:opacity-100`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{t("chat.copy.action")}</TooltipContent>
    </Tooltip>
  )
}
