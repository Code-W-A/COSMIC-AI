"use client"

import Image from "next/image"

type AppLogoProps = {
  size?: number
  className?: string
  rounded?: boolean
}

export function AppLogo({ size = 32, className = "", rounded = true }: AppLogoProps) {
  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden ${rounded ? "rounded-full" : "rounded-lg"} ${className}`}
      style={{ width: size, height: size }}
      aria-label="Cosmic AI"
    >
      <Image
        src="/branding/logo-new.png"
        alt="Cosmic AI logo"
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority={size >= 48}
      />
    </span>
  )
}
