#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function read(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8")
}

function extractLocaleBlock(source, locale) {
  const marker = `${locale}: {`
  const start = source.indexOf(marker)
  if (start < 0) {
    throw new Error(`Locale block "${locale}" not found in lib/i18n/messages.ts`)
  }

  let index = start + marker.length
  let depth = 1
  while (index < source.length && depth > 0) {
    const char = source[index]
    if (char === "{") depth += 1
    if (char === "}") depth -= 1
    index += 1
  }

  return source.slice(start, index)
}

function extractMessageKeys(source) {
  const keys = new Set()
  const regex = /"([^"]+)":\s*"/g
  let match = regex.exec(source)
  while (match) {
    keys.add(match[1])
    match = regex.exec(source)
  }
  return keys
}

function checkMessagesParity() {
  const source = read("lib/i18n/messages.ts")
  const enKeys = extractMessageKeys(extractLocaleBlock(source, "en"))
  const roKeys = extractMessageKeys(extractLocaleBlock(source, "ro"))

  const missingInRo = [...enKeys].filter((key) => !roKeys.has(key))
  const missingInEn = [...roKeys].filter((key) => !enKeys.has(key))

  return { missingInRo, missingInEn }
}

function checkHardcodedText() {
  const files = [
    "app/onboarding/page.tsx",
    "app/chat/page.tsx",
    "app/billing/setup/setup-client.tsx",
    "app/report/page.tsx",
    "components/auth/auth-form.tsx",
    "components/account/subscription-card.tsx",
    "components/landing/hero-section.tsx",
    "components/landing/how-it-works.tsx",
    "components/landing/agents-section.tsx",
    "components/landing/chat-preview.tsx",
    "components/landing/cosmic-data.tsx",
    "components/landing/faq-section.tsx",
    "components/landing/testimonials.tsx",
    "components/landing/footer.tsx",
    "components/landing/final-cta.tsx",
    "components/landing/pricing-section.tsx",
  ]

  const findings = []
  const allowExact = new Set(["Cosmic AI", "FAQ", "RO", "EN", "G", ""])
  const jsxTextRegex = />([^<>{\n]*[A-Za-zĂÂÎȘȚăâîșț][^<>{\n]*)</g
  const propLiteralRegex =
    /(placeholder|aria-label|title|alt)=["']([^"'{}]*[A-Za-zĂÂÎȘȚăâîșț][^"'{}]*)["']/g

  for (const file of files) {
    const source = read(file)
    const lines = source.split("\n")

    lines.forEach((line, index) => {
      if (line.includes("isRo ?") || line.includes("t(") || line.includes("translate(")) {
        return
      }

      let match = jsxTextRegex.exec(line)
      while (match) {
        const text = match[1].trim().replace(/\s+/g, " ")
        if (!allowExact.has(text)) {
          findings.push(`${file}:${index + 1} -> text node "${text}"`)
        }
        match = jsxTextRegex.exec(line)
      }
      jsxTextRegex.lastIndex = 0

      let propMatch = propLiteralRegex.exec(line)
      while (propMatch) {
        const text = propMatch[2].trim().replace(/\s+/g, " ")
        if (!allowExact.has(text)) {
          findings.push(`${file}:${index + 1} -> ${propMatch[1]} literal "${text}"`)
        }
        propMatch = propLiteralRegex.exec(line)
      }
      propLiteralRegex.lastIndex = 0
    })
  }

  return findings
}

function main() {
  const parity = checkMessagesParity()
  const hardcoded = checkHardcodedText()
  const errors = []

  if (parity.missingInRo.length > 0) {
    errors.push(`Missing in ro (${parity.missingInRo.length}): ${parity.missingInRo.join(", ")}`)
  }
  if (parity.missingInEn.length > 0) {
    errors.push(`Missing in en (${parity.missingInEn.length}): ${parity.missingInEn.join(", ")}`)
  }
  if (hardcoded.length > 0) {
    errors.push(`Potential hardcoded user-facing strings:\n${hardcoded.join("\n")}`)
  }

  if (errors.length > 0) {
    console.error("[i18n-check] FAILED")
    errors.forEach((item) => console.error(item))
    process.exit(1)
  }

  console.log("[i18n-check] OK")
}

main()
