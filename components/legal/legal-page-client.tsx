"use client"

import Link from "next/link"

import { Footer } from "@/components/landing/footer"
import { Navigation } from "@/components/landing/navigation"
import type { LegalDocument } from "@/lib/legal/types"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"

interface LegalPageProps {
  document: LegalDocument
  testId: string
}

export function LegalPageClient({ document, testId }: LegalPageProps) {
  const { t } = useTranslations()
  const localizedPath = useLocalizedPath()

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <Navigation />
      <div className="pt-16">
        <article
          data-testid={testId}
          className="mx-auto max-w-3xl px-6 py-16"
        >
          <header className="mb-12">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {document.title}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("legal.lastUpdated")}: {document.lastUpdated}
            </p>
          </header>

          <div className="space-y-10">
            {document.sections.map((section) => (
              <section key={section.id} id={section.id}>
                <h2 className="mb-4 text-xl font-semibold text-foreground">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-sm leading-relaxed text-muted-foreground"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-16 border-t border-border pt-8">
            <p className="text-sm text-muted-foreground">
              <Link
                href={localizedPath("/")}
                className="font-medium text-cosmic-lavender hover:text-foreground"
              >
                {t("legal.backToHome")}
              </Link>
            </p>
          </footer>
        </article>
      </div>
      <Footer />
    </main>
  )
}
