"use client"

import Link from "next/link"
import { AppLogo } from "@/components/branding/app-logo"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"

const footerLinks = {
  en: {
    Product: [
      { label: "Agents", href: "/#agents" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
    Company: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
    ],
    Legal: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  },
  ro: {
    Produs: [
      { label: "Agenți", href: "/#agents" },
      { label: "Cum funcționează", href: "/#how-it-works" },
      { label: "Prețuri", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
    Companie: [
      { label: "Despre noi", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Cariere", href: "#" },
      { label: "Presă", href: "#" },
    ],
    Legal: [
      { label: "Politica de confidențialitate", href: "#" },
      { label: "Termeni și condiții", href: "#" },
      { label: "Politica cookies", href: "#" },
    ],
  },
}

export function Footer() {
  const localizedPath = useLocalizedPath()
  const { locale } = useTranslations()
  const isRo = locale === "ro"
  const currentLinks = isRo ? footerLinks.ro : footerLinks.en

  return (
    <footer className="relative border-t border-[rgba(255,255,255,0.06)] bg-[#0D0820]/50">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href={localizedPath("/")} className="mb-5 inline-flex items-center gap-2">
              <AppLogo size={32} className="ring-1 ring-white/20" />
              <span className="text-lg font-bold text-[#F5F2FF] tracking-tight">
                Cosmic AI
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#B8B2D9]">
              {isRo
                ? "Ghidaj astrologic AI care combină date reale din harta natală cu conversație personalizată pentru autocunoaștere mai profundă."
                : "AI-powered astrology guidance that blends real birth chart data with personalized conversation for deeper self-understanding."}
            </p>

            {/* Newsletter */}
            <div className="mt-8">
              <p className="mb-3 text-sm font-medium text-[#F5F2FF]">
                {isRo ? "Rămâi conectat cosmic" : "Stay cosmic"}
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder={isRo ? "Introdu emailul tău" : "Enter your email"}
                  className="flex-1 rounded-full border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] px-5 py-2.5 text-sm text-[#F5F2FF] placeholder:text-[#B8B2D9]/50 outline-none transition-all focus:border-[#6D4BFF]/50 focus:ring-1 focus:ring-[#6D4BFF]/30"
                />
                <button className="rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-5 py-2.5 text-sm font-medium text-[#F5F2FF] transition-all hover:shadow-lg hover:shadow-[#6D4BFF]/20">
                  {isRo ? "Abonează-te" : "Subscribe"}
                </button>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(currentLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 text-sm font-semibold text-[#F5F2FF]">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href.startsWith("/#") ? `${localizedPath("/")}${link.href.slice(1)}` : link.href}
                      className="text-sm text-[#B8B2D9] transition-colors hover:text-[#F5F2FF]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.06)] pt-8 md:flex-row">
          <p className="text-xs text-[#B8B2D9]/60">
            &copy; {new Date().getFullYear()} Cosmic AI.{" "}
            {isRo ? "Toate drepturile rezervate." : "All rights reserved."}
          </p>
          <div className="flex gap-5">
            {["Twitter", "Instagram", "TikTok", "Discord"].map((social) => (
              <a
                key={social}
                href="#"
                className="text-xs text-[#B8B2D9]/60 transition-colors hover:text-[#B69CFF]"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
