"use client"

import { useRef, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Sparkles,
  User,
  Calendar,
  Clock,
  MapPin,
  Compass,
  ArrowRight,
  Sun,
  Moon,
  Heart,
  Briefcase,
  Star,
  ChevronDown,
  Check,
} from "lucide-react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { apiFetch } from "@/lib/api/client"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"
import {
  detectBrowserTimezone,
  getCurrentSystemOffsetHours,
  getOffsetHoursForTimeZoneAtLocalDateTime,
} from "@/lib/divineapi/timezone"
import {
  isMainFocus,
  isSexAtBirth,
  type MainFocus,
  type SexAtBirth,
} from "@/types/user"

/* ─── Starfield Canvas ─── */
function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let stars: {
      x: number
      y: number
      r: number
      o: number
      pulse: number
      pSpeed: number
    }[] = []

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio)
      initStars()
    }

    function initStars() {
      if (!canvas) return
      const count = Math.floor(
        (canvas.offsetWidth * canvas.offsetHeight) / 4000
      )
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas!.offsetWidth,
        y: Math.random() * canvas!.offsetHeight,
        r: Math.random() * 1.3 + 0.2,
        o: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
        pSpeed: Math.random() * 0.006 + 0.002,
      }))
    }

    function draw() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      for (const s of stars) {
        s.pulse += s.pSpeed
        const opacity = s.o + Math.sin(s.pulse) * 0.2
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(182, 156, 255, ${Math.max(0.04, opacity)})`
        ctx.fill()
        if (s.r > 0.9) {
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(109, 75, 255, ${Math.max(0.01, opacity * 0.1)})`
          ctx.fill()
        }
      }
      animationId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener("resize", resize)
    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  )
}

/* ─── Focus Options ─── */
function getFocusOptions(isRo: boolean) {
  return [
    { value: "love", label: isRo ? "Iubire" : "Love", icon: Heart, color: "#D66BFF" },
    {
      value: "compatibility",
      label: isRo ? "Compatibilitate" : "Compatibility",
      icon: Star,
      color: "#8B5CFF",
    },
    {
      value: "self_discovery",
      label: isRo ? "Autocunoaștere" : "Self-Discovery",
      icon: Compass,
      color: "#B69CFF",
    },
    { value: "career", label: isRo ? "Carieră" : "Career", icon: Briefcase, color: "#4BC8FF" },
    {
      value: "daily_guidance",
      label: isRo ? "Ghidaj zilnic" : "Daily Guidance",
      icon: Sun,
      color: "#FFB86D",
    },
  ]
}

/* ─── Floating Orbs ─── */
function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Large violet orb — upper left */}
      <div className="animate-float absolute -left-20 top-[10%] h-[350px] w-[350px] rounded-full bg-[#6D4BFF]/[0.06] blur-[100px]" />
      {/* Pink orb — lower right */}
      <div className="animate-float-delayed absolute -right-16 bottom-[5%] h-[280px] w-[280px] rounded-full bg-[#D66BFF]/[0.05] blur-[90px]" />
      {/* Small indigo orb — top right */}
      <div className="animate-float-slow absolute right-[20%] top-[5%] h-[180px] w-[180px] rounded-full bg-[#8B5CFF]/[0.07] blur-[70px]" />
    </div>
  )
}

/* ─── Step Indicator ─── */
function StepIndicator({ currentStep, isRo }: { currentStep: number; isRo: boolean }) {
  const steps = [
    { num: 1, label: isRo ? "Personal" : "Personal" },
    { num: 2, label: isRo ? "Detalii naștere" : "Birth Details" },
    { num: 3, label: isRo ? "Focus" : "Focus" },
  ]
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
                currentStep > step.num
                  ? "bg-[#6D4BFF] text-foreground shadow-lg shadow-[#6D4BFF]/30"
                  : currentStep === step.num
                    ? "border border-[#6D4BFF]/50 bg-[#6D4BFF]/20 text-[#B69CFF] shadow-lg shadow-[#6D4BFF]/20"
                    : "border border-border bg-[rgba(255,255,255,0.03)] text-muted-foreground"
              }`}
            >
              {currentStep > step.num ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                step.num
              )}
            </div>
            <span
              className={`hidden text-xs font-medium sm:inline ${
                currentStep >= step.num
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mx-1 h-px w-8 transition-colors duration-500 sm:w-12 ${
                currentStep > step.num
                  ? "bg-[#6D4BFF]/60"
                  : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── Custom Select Dropdown ─── */
function FocusSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: ReturnType<typeof getFocusOptions>
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3.5 text-left text-sm transition-all hover:border-[#6D4BFF]/30 hover:bg-[rgba(255,255,255,0.06)] focus:border-[#6D4BFF]/50 focus:outline-none focus:ring-1 focus:ring-[#6D4BFF]/30"
      >
        {selected ? (
          <span className="flex items-center gap-2.5">
            <selected.icon className="h-4 w-4" style={{ color: selected.color }} />
            <span className="text-foreground">{selected.label}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-[#0D0820] shadow-xl shadow-[#6D4BFF]/[0.08] backdrop-blur-xl"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-all hover:bg-[rgba(255,255,255,0.05)] ${
                  value === option.value
                    ? "bg-[rgba(109,75,255,0.1)] text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <option.icon
                  className="h-4 w-4"
                  style={{ color: option.color }}
                />
                <span>{option.label}</span>
                {value === option.value && (
                  <Check className="ml-auto h-3.5 w-3.5 text-[#6D4BFF]" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Animated Input Field ─── */
function FormField({
  label,
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  delay = 0,
}: {
  label: string
  icon: React.ElementType
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  delay?: number
}) {
  const isPickerInput = type === "date" || type === "time"

  function openNativePicker(event: React.MouseEvent<HTMLInputElement>) {
    if (!isPickerInput) return
    const input = event.currentTarget as HTMLInputElement & {
      showPicker?: () => void
    }
    try {
      input.showPicker?.()
    } catch {
      // Browser may deny showPicker even on click in some contexts.
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-3.5 w-3.5 text-[#B69CFF]" />
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={openNativePicker}
        className={`w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground/60 transition-all hover:border-[#6D4BFF]/30 hover:bg-[rgba(255,255,255,0.06)] focus:border-[#6D4BFF]/50 focus:bg-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-1 focus:ring-[#6D4BFF]/30 ${isPickerInput ? "[color-scheme:dark] [appearance:textfield] [&::-webkit-calendar-picker-indicator]:pointer-events-none [&::-webkit-calendar-picker-indicator]:opacity-0" : ""}`}
      />
    </motion.div>
  )
}

/* ─── Main Onboarding Page ─── */
export default function OnboardingPage() {
  const router = useRouter()
  const localizedPath = useLocalizedPath()
  const { locale } = useTranslations()
  const isRo = locale === "ro"
  const focusOptions = getFocusOptions(isRo)
  const [isProfileGateLoading, setIsProfileGateLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [birthTime, setBirthTime] = useState("")
  const [birthPlace, setBirthPlace] = useState("")
  const [sexAtBirth, setSexAtBirth] = useState<SexAtBirth | "">("")
  const [focus, setFocus] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function guardExistingUsersFromOnboarding() {
      try {
        const response = await apiFetch<{
          profile: {
            name?: string
            birthDate?: string
            birthTime?: string
            birthPlace?: string
            sexAtBirth?: string
            mainFocus?: string
          } | null
          profileComplete?: boolean
        }>("/api/user/profile", {
          method: "GET",
        })

        if (cancelled) return

        if (response.profile) {
          if (typeof response.profile.name === "string") setName(response.profile.name)
          if (typeof response.profile.birthDate === "string") setBirthDate(response.profile.birthDate)
          if (typeof response.profile.birthTime === "string") setBirthTime(response.profile.birthTime)
          if (typeof response.profile.birthPlace === "string") setBirthPlace(response.profile.birthPlace)
          if (isSexAtBirth(response.profile.sexAtBirth)) setSexAtBirth(response.profile.sexAtBirth)
          if (isMainFocus(response.profile.mainFocus)) setFocus(response.profile.mainFocus)
        }

        if (response.profile && response.profileComplete) {
          router.replace(localizedPath("/chat"))
          return
        }
      } catch {
        // Allow onboarding to continue if profile lookup fails.
      }

      if (!cancelled) {
        setIsProfileGateLoading(false)
      }
    }

    guardExistingUsersFromOnboarding()

    return () => {
      cancelled = true
    }
  }, [localizedPath, router])

  function canProceed() {
    if (step === 1) return name.trim().length > 0
    if (step === 2) {
      return (
        birthDate.trim().length > 0 &&
        birthTime.trim().length > 0 &&
        birthPlace.trim().length > 0 &&
        sexAtBirth.trim().length > 0
      )
    }
    if (step === 3) return focus.length > 0
    return false
  }

  async function handleNext() {
    setError("")

    if (step < 3) {
      setStep(step + 1)
    } else {
      setIsSubmitting(true)

      try {
        const timezoneIana = detectBrowserTimezone()
        const timezoneOffsetNow = getCurrentSystemOffsetHours()
        const timezoneOffsetAtBirth =
          timezoneIana && birthDate && birthTime
            ? getOffsetHoursForTimeZoneAtLocalDateTime(timezoneIana, {
                date: birthDate,
                time: birthTime,
              })
            : undefined

        await apiFetch("/api/user/profile", {
          method: "POST",
          body: {
            name,
            birthDate,
            birthTime,
            birthPlace,
            sexAtBirth,
            timezoneIana,
            timezoneOffsetNow,
            timezoneOffsetAtBirth,
            mainFocus: focus,
          },
        })

        router.push(localizedPath("/chat"))
      } catch (profileError) {
        setError(
          profileError instanceof Error
            ? profileError.message
            : isRo
              ? "Nu am putut salva profilul tău cosmic."
              : "Unable to save your cosmic profile."
        )
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1)
  }

  return (
    <AuthGuard>
    {isProfileGateLoading ? (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4">
        <p className="text-sm text-muted-foreground">
          {isRo ? "Verificăm profilul tău..." : "Checking your profile..."}
        </p>
      </div>
    ) : (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Background layers */}
      <StarfieldCanvas />
      <FloatingOrbs />

      {/* Radial glows */}
      <div
        className="pointer-events-none absolute left-1/2 top-[30%] h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(109,75,255,0.12) 0%, rgba(109,75,255,0.03) 50%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-[10%] h-[400px] w-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(214,107,255,0.08) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-lg">
        {/* Logo + brand */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col items-center"
        >
          <Link href={localizedPath("/")} className="flex flex-col items-center">
            <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6D4BFF]/15">
              <Sparkles className="h-7 w-7 text-[#8B5CFF]" />
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  boxShadow: "0 0 30px rgba(109,75,255,0.25)",
                }}
                aria-hidden="true"
              />
            </div>
            <h1
              className="text-2xl font-bold tracking-tight text-foreground"
              style={{
                fontFamily: "var(--font-space-grotesk, var(--font-sans))",
              }}
            >
              Cosmic AI
            </h1>
          </Link>
        </motion.div>

        {/* Step indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <StepIndicator currentStep={step} isRo={isRo} />
        </motion.div>

        {/* Glassmorphism form card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative overflow-hidden rounded-3xl"
        >
          {/* Gradient border ring */}
          <div
            className="pointer-events-none absolute -inset-px rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(109,75,255,0.3), rgba(214,107,255,0.15), rgba(109,75,255,0.05))",
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              maskComposite: "exclude",
              padding: "1px",
            }}
            aria-hidden="true"
          />

          {/* Card inner */}
          <div className="rounded-3xl bg-[#0D0820]/70 px-6 py-8 backdrop-blur-xl sm:px-8 sm:py-10">
            <AnimatePresence mode="wait">
              {/* ── Step 1: Personal ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                      {isRo ? "Creează-ți profilul cosmic" : "Create Your Cosmic Profile"}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {isRo
                        ? "Introdu detaliile nașterii pentru recomandări personalizate de la agenții AI."
                        : "Enter your birth details so your AI agents can personalize your readings."}
                    </p>
                  </div>

                  <div className="space-y-5">
                    <FormField
                      label={isRo ? "Nume" : "Name"}
                      icon={User}
                      placeholder={isRo ? "Introdu numele tău" : "Enter your name"}
                      value={name}
                      onChange={setName}
                      delay={0.05}
                    />
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Birth Details ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                      {isRo ? "Detalii de naștere" : "Birth Details"}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {isRo
                        ? "Datele nașterii permit calcule astrologice precise pentru insight-uri personalizate."
                        : "Your birth data powers accurate chart calculations for personalized AI insights."}
                    </p>
                  </div>

                  <div className="space-y-5">
                    <FormField
                      label={isRo ? "Data nașterii" : "Birth Date"}
                      icon={Calendar}
                      type="date"
                      placeholder={isRo ? "Selectează data nașterii" : "Select your birth date"}
                      value={birthDate}
                      onChange={setBirthDate}
                      delay={0.05}
                    />
                    <FormField
                      label={isRo ? "Ora nașterii" : "Birth Time"}
                      icon={Clock}
                      type="time"
                      placeholder={isRo ? "Introdu ora nașterii" : "Enter your birth time"}
                      value={birthTime}
                      onChange={setBirthTime}
                      delay={0.1}
                    />
                    <FormField
                      label={isRo ? "Locul nașterii" : "Birth Place"}
                      icon={MapPin}
                      placeholder={isRo ? "Oraș, județ sau țară" : "City, State or Country"}
                      value={birthPlace}
                      onChange={setBirthPlace}
                      delay={0.15}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                        <User className="h-3.5 w-3.5 text-[#B69CFF]" />
                        {isRo ? "Sex biologic" : "Sex at birth"}
                      </label>
                      <select
                        value={sexAtBirth}
                        onChange={(event) => {
                          const value = event.target.value
                          setSexAtBirth(value === "male" || value === "female" ? value : "")
                        }}
                        className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3.5 text-sm text-foreground transition-all hover:border-[#6D4BFF]/30 hover:bg-[rgba(255,255,255,0.06)] focus:border-[#6D4BFF]/50 focus:bg-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-1 focus:ring-[#6D4BFF]/30"
                      >
                        <option value="">
                          {isRo ? "Selectează sexul biologic" : "Select sex at birth"}
                        </option>
                        <option value="male">{isRo ? "Masculin" : "Male"}</option>
                        <option value="female">{isRo ? "Feminin" : "Female"}</option>
                      </select>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Focus ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                      {isRo ? "Care este focusul tău?" : "What Brings You Here?"}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {isRo
                        ? "Alege focusul principal ca să te potrivim cu agentul AI potrivit."
                        : "Choose your main focus so we can match you with the right AI agent."}
                    </p>
                  </div>

                  <div className="space-y-5">
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.05 }}
                    >
                      <label className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                        <Compass className="h-3.5 w-3.5 text-[#B69CFF]" />
                        {isRo ? "Focus principal" : "Main Focus"}
                      </label>
                      <FocusSelect
                        value={focus}
                        onChange={setFocus}
                        options={focusOptions}
                        placeholder={isRo ? "Alege focusul principal" : "Select your main focus"}
                      />
                    </motion.div>

                    {/* Visual focus cards */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.15 }}
                      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
                    >
                      {focusOptions.map((option) => {
                        const isSelected = focus === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFocus(option.value)}
                            className={`group flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-center transition-all ${
                              isSelected
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            style={
                              isSelected
                                ? {
                                    background: `${option.color}12`,
                                    border: `1px solid ${option.color}40`,
                                    boxShadow: `0 0 25px ${option.color}15`,
                                  }
                                : {
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                  }
                            }
                          >
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                                isSelected ? "" : "bg-[rgba(255,255,255,0.04)]"
                              }`}
                              style={
                                isSelected
                                  ? { background: `${option.color}20` }
                                  : undefined
                              }
                            >
                              <option.icon
                                className="h-5 w-5 transition-colors"
                                style={{
                                  color: isSelected
                                    ? option.color
                                    : undefined,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium">
                              {option.label}
                            </span>
                          </button>
                        )
                      })}
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="mt-8 flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-5 py-3 text-sm font-medium text-muted-foreground transition-all hover:border-[#6D4BFF]/30 hover:bg-[rgba(255,255,255,0.06)] hover:text-foreground"
                >
                  {isRo ? "Înapoi" : "Back"}
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className="group relative flex flex-1 items-center justify-center gap-2.5 overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-foreground transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: canProceed() && !isSubmitting
                    ? "linear-gradient(135deg, #6D4BFF 0%, #8B5CFF 100%)"
                    : "rgba(109,75,255,0.15)",
                  boxShadow: canProceed() && !isSubmitting
                    ? "0 0 30px rgba(109,75,255,0.3), 0 4px 16px rgba(109,75,255,0.2)"
                    : "none",
                }}
              >
                {/* Shimmer sweep */}
                {canProceed() && !isSubmitting && (
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.1] to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                )}
                {step < 3 ? (
                  <>
                    {isRo ? "Continuă" : "Continue"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {isSubmitting
                      ? isRo
                        ? "Se salvează..."
                        : "Saving..."
                      : isRo
                        ? "Creează profilul meu cosmic"
                        : "Create My Cosmic Profile"}
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {error}
              </p>
            )}
          </div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-6 text-center text-xs leading-relaxed text-muted-foreground/50"
        >
          {isRo
            ? "Datele nașterii personalizează experiența ta astrologică AI."
            : "Your birth details help personalize your astrology AI experience."}
          <br />
          {isRo
            ? "Nu partajăm datele tale cu terți."
            : "We never share your data with third parties."}
        </motion.p>

        {/* Decorative zodiac ring (subtle) */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.03]"
          style={{
            border: "1px solid rgba(109,75,255,0.3)",
            background: "transparent",
          }}
          aria-hidden="true"
        />
      </div>
    </div>
    )}
    </AuthGuard>
  )
}
