"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, Sparkles } from "lucide-react"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useTranslations()
  const localizedPath = useLocalizedPath()
  const homeHref = localizedPath("/")
  const navLinks = [
    { label: t("nav.agents"), href: `${homeHref}#agents` },
    { label: t("nav.how"), href: `${homeHref}#how-it-works` },
    { label: t("nav.experience"), href: `${homeHref}#experience` },
    { label: t("nav.pricing"), href: `${homeHref}#pricing` },
    { label: t("nav.faq"), href: `${homeHref}#faq` },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass-strong shadow-lg shadow-[#6D4BFF]/5"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href={homeHref} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D4BFF] to-[#D66BFF]">
            <Sparkles className="h-4 w-4 text-[#F5F2FF]" />
          </div>
          <span className="text-lg font-bold text-[#F5F2FF] tracking-tight">
            Cosmic AI
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[#B8B2D9] transition-colors hover:text-[#F5F2FF]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher compact />
          <Link
            href={localizedPath("/login")}
            className="px-3 py-2 text-sm font-medium text-[#B8B2D9] transition-colors hover:text-[#F5F2FF]"
          >
            {t("nav.login")}
          </Link>
          <Link
            href={localizedPath("/onboarding")}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-5 py-2.5 text-sm font-medium text-[#F5F2FF] transition-all hover:shadow-lg hover:shadow-[#6D4BFF]/30"
          >
            {t("nav.start")}
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-[#F5F2FF] md:hidden"
          aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-strong overflow-hidden md:hidden"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              <LanguageSwitcher />
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-[#B8B2D9] transition-colors hover:text-[#F5F2FF]"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href={localizedPath("/login")}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-[#B8B2D9] transition-colors hover:text-[#F5F2FF]"
              >
                {t("nav.login")}
              </Link>
              <Link
                href={localizedPath("/onboarding")}
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-5 py-2.5 text-sm font-medium text-[#F5F2FF]"
              >
                {t("nav.start")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
