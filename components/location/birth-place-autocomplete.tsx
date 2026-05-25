"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { apiFetch } from "@/lib/api/client"
import type { LocationAutocompleteSuggestion, ResolvedBirthLocation } from "@/lib/location/types"

type LocationAutocompletePayload = {
  suggestions: LocationAutocompleteSuggestion[]
}

type LocationResolvePayload = {
  location: ResolvedBirthLocation
}

type BirthPlaceAutocompleteProps = {
  label: string
  placeholder: string
  value: string
  birthDate: string
  birthTime: string
  required?: boolean
  disabled?: boolean
  onValueChange: (value: string) => void
  onResolvedChange: (value: ResolvedBirthLocation | null) => void
  initialResolvedLocation?: ResolvedBirthLocation | null
  messages: {
    loadingSuggestions: string
    loadingResolution: string
    missingBirthDateTime: string
    noResults: string
  }
}

export function BirthPlaceAutocomplete({
  label,
  placeholder,
  value,
  birthDate,
  birthTime,
  required = false,
  disabled = false,
  onValueChange,
  onResolvedChange,
  initialResolvedLocation = null,
  messages,
}: BirthPlaceAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [suggestions, setSuggestions] = useState<LocationAutocompleteSuggestion[]>([])
  const [resolveError, setResolveError] = useState("")
  const [selection, setSelection] = useState<{ placeId: string; description: string } | null>(
    initialResolvedLocation
      ? { placeId: initialResolvedLocation.placeId, description: initialResolvedLocation.birthPlace }
      : null
  )
  const hasBirthDateTime = birthDate.trim().length > 0 && birthTime.trim().length > 0
  const rootRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!initialResolvedLocation) return
    setSelection({
      placeId: initialResolvedLocation.placeId,
      description: initialResolvedLocation.birthPlace,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialResolvedLocation?.placeId, initialResolvedLocation?.birthPlace])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    if (selection && value.trim() !== selection.description.trim()) {
      setSelection(null)
      setResolveError("")
      onResolvedChange(null)
    }
  }, [onResolvedChange, selection, value])

  useEffect(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
    }

    const query = value.trim()
    if (!query || query.length < 2) {
      setSuggestions([])
      setLoadingSuggestions(false)
      return
    }

    debounceRef.current = window.setTimeout(() => {
      const nextRequestId = requestIdRef.current + 1
      requestIdRef.current = nextRequestId
      setLoadingSuggestions(true)

      apiFetch<{ success: true } & LocationAutocompletePayload>(
        `/api/location/autocomplete?q=${encodeURIComponent(query)}`
      )
        .then((payload) => {
          if (requestIdRef.current !== nextRequestId) return
          setSuggestions(payload.suggestions ?? [])
          setOpen(true)
        })
        .catch(() => {
          if (requestIdRef.current !== nextRequestId) return
          setSuggestions([])
        })
        .finally(() => {
          if (requestIdRef.current === nextRequestId) {
            setLoadingSuggestions(false)
          }
        })
    }, 220)

    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [value])

  async function runResolve(nextSelection: { placeId: string; description: string }) {
    if (!hasBirthDateTime) {
      setResolveError(messages.missingBirthDateTime)
      onResolvedChange(null)
      return
    }

    setResolving(true)
    setResolveError("")
    try {
      const payload = await apiFetch<{ success: true } & LocationResolvePayload>(
        "/api/location/resolve",
        {
          method: "POST",
          body: {
            placeId: nextSelection.placeId,
            birthDate,
            birthTime,
          },
        }
      )

      onValueChange(payload.location.birthPlace)
      onResolvedChange(payload.location)
      setSelection({
        placeId: payload.location.placeId,
        description: payload.location.birthPlace,
      })
      setOpen(false)
    } catch (error) {
      onResolvedChange(null)
      setResolveError(error instanceof Error ? error.message : "")
    } finally {
      setResolving(false)
    }
  }

  useEffect(() => {
    if (!selection || !hasBirthDateTime) return
    if (resolving) return
    if (resolveError && resolveError !== messages.missingBirthDateTime) return

    if (selection.description.trim() === value.trim()) {
      void runResolve(selection)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthDate, birthTime])

  const showDropdown = useMemo(
    () =>
      open &&
      !disabled &&
      (loadingSuggestions ||
        suggestions.length > 0 ||
        (value.trim().length >= 2 && suggestions.length === 0)),
    [disabled, loadingSuggestions, open, suggestions.length, value]
  )

  return (
    <div className="space-y-2" ref={rootRef}>
      <label className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          required={required}
          disabled={disabled || resolving}
          onFocus={() => {
            if (suggestions.length > 0 || loadingSuggestions) {
              setOpen(true)
            }
          }}
          onChange={(event) => {
            onValueChange(event.target.value)
            setResolveError("")
            setOpen(true)
          }}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
        />
        {showDropdown && (
          <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
            {loadingSuggestions && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {messages.loadingSuggestions}
              </div>
            )}
            {!loadingSuggestions && suggestions.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">{messages.noResults}</div>
            )}
            {!loadingSuggestions &&
              suggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    onValueChange(suggestion.description)
                    const nextSelection = {
                      placeId: suggestion.placeId,
                      description: suggestion.description,
                    }
                    setSelection(nextSelection)
                    void runResolve(nextSelection)
                  }}
                >
                  <div className="font-medium text-foreground">{suggestion.mainText}</div>
                  {suggestion.secondaryText && (
                    <div className="text-xs text-muted-foreground">{suggestion.secondaryText}</div>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>
      {resolving && (
        <p className="text-xs text-muted-foreground">{messages.loadingResolution}</p>
      )}
      {resolveError && <p className="text-xs text-red-500">{resolveError}</p>}
    </div>
  )
}
