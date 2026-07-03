import type { Locale } from "@/lib/i18n/locale"

export interface LegalSection {
  id: string
  title: string
  paragraphs: string[]
}

export interface LegalDocument {
  title: string
  lastUpdated: string
  sections: LegalSection[]
}

export type LegalDocumentMap = Record<Locale, LegalDocument>
