"use client"

import Image from "next/image"
import {
  Briefcase,
  Compass,
  Heart,
  Sparkles,
  Sun,
  Users,
} from "lucide-react"
import { type ElementType, useEffect, useMemo, useState } from "react"

import { agentAvatarCatalog } from "@/lib/agents/avatar-catalog"
import type { AgentType } from "@/types/agent"

type AvatarSize = "sm" | "md" | "lg"

const dimensionsBySize: Record<AvatarSize, number> = {
  sm: 28,
  md: 40,
  lg: 72,
}

const fallbackIcons: Record<AgentType, ElementType> = {
  birth_chart: Compass,
  love: Heart,
  compatibility: Users,
  daily_guidance: Sun,
  career_purpose: Briefcase,
  spiritual_reflection: Sparkles,
}

function withPngFallback(path: string) {
  return path.replace(/\.webp$/i, ".png")
}

export function AgentAvatar({
  agentType,
  size = "md",
  showRing = true,
  priority = false,
}: {
  agentType: AgentType
  size?: AvatarSize
  showRing?: boolean
  priority?: boolean
}) {
  const entry = agentAvatarCatalog[agentType]
  const dimension = dimensionsBySize[size]
  const fallbackIcon = fallbackIcons[agentType]
  const accentColor = entry.accentColor
  const source = useMemo(() => {
    if (size === "sm") return entry.avatarSrcSm
    if (size === "md") return entry.avatarSrcMd
    return entry.avatarSrcLg
  }, [entry, size])
  const [currentSrc, setCurrentSrc] = useState(source)
  const [hasImageFailed, setHasImageFailed] = useState(false)

  useEffect(() => {
    setCurrentSrc(source)
    setHasImageFailed(false)
  }, [source])

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: dimension,
        height: dimension,
        background: `${accentColor}20`,
        border: showRing ? `1px solid ${accentColor}50` : "none",
        boxShadow: showRing ? `0 0 18px ${accentColor}25` : "none",
      }}
      aria-label={`${entry.personaName} - ${entry.displayName}`}
      title={entry.personaTagline}
    >
      {hasImageFailed ? (
        <fallbackIcon
          className={size === "lg" ? "h-8 w-8" : size === "md" ? "h-5 w-5" : "h-4 w-4"}
          style={{ color: accentColor }}
          strokeWidth={1.75}
        />
      ) : (
        <Image
          src={currentSrc}
          alt={entry.altText}
          width={dimension}
          height={dimension}
          priority={priority}
          className="h-full w-full object-cover"
          onError={() => {
            if (currentSrc.endsWith(".webp")) {
              setCurrentSrc(withPngFallback(currentSrc))
              return
            }

            setHasImageFailed(true)
          }}
        />
      )}
    </span>
  )
}
