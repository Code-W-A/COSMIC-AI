"use client"

import { Sparkles } from "lucide-react"

const footerLinks = {
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
}

export function Footer() {
  return (
    <footer className="relative border-t border-[rgba(255,255,255,0.06)] bg-[#0D0820]/50">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="/" className="mb-5 inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D4BFF] to-[#D66BFF]">
                <Sparkles className="h-4 w-4 text-[#F5F2FF]" />
              </div>
              <span className="text-lg font-bold text-[#F5F2FF] tracking-tight">
                Cosmic AI
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#B8B2D9]">
              AI-powered astrology guidance that blends real birth chart data
              with personalized conversation for deeper self-understanding.
            </p>

            {/* Newsletter */}
            <div className="mt-8">
              <p className="mb-3 text-sm font-medium text-[#F5F2FF]">
                Stay cosmic
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 rounded-full border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] px-5 py-2.5 text-sm text-[#F5F2FF] placeholder:text-[#B8B2D9]/50 outline-none transition-all focus:border-[#6D4BFF]/50 focus:ring-1 focus:ring-[#6D4BFF]/30"
                />
                <button className="rounded-full bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-5 py-2.5 text-sm font-medium text-[#F5F2FF] transition-all hover:shadow-lg hover:shadow-[#6D4BFF]/20">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 text-sm font-semibold text-[#F5F2FF]">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
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
            &copy; {new Date().getFullYear()} Cosmic AI. All rights reserved.
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
