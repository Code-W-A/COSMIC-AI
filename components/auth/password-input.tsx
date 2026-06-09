"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

interface PasswordInputProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  testId: string
  showLabel: string
  hideLabel: string
  required?: boolean
  minLength?: number
  autoComplete?: string
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  testId,
  showLabel,
  hideLabel,
  required = false,
  minLength,
  autoComplete,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const inputId = id ?? testId

  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>
      <div className="relative">
        <input
          id={inputId}
          data-testid={testId}
          required={required}
          minLength={minLength}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 pr-11 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
          placeholder={placeholder}
          autoComplete={autoComplete ?? (testId.includes("confirm") ? "new-password" : "current-password")}
        />
        <button
          type="button"
          data-testid={`${testId}-toggle`}
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-[rgba(255,255,255,0.06)] hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  )
}
