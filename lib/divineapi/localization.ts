import "server-only"

import { createHash } from "node:crypto"

import { FieldValue } from "firebase-admin/firestore"
import OpenAI from "openai"

import { getTranslationCacheRef } from "@/lib/firebase/firestore"
import { logError, logInfo, logWarn } from "@/lib/logging/logger"
import type { CompatibilityData, DailyHoroscopeData, NatalChartData } from "@/lib/divineapi/types"

type LocalizedAstrologySnapshot = {
  locale: "ro"
  segments: Record<string, string>
}

type TranslationSegmentEntry = {
  segmentKey: string
  sourceText: string
  keyHash: string
}

type TranslateDivineContentResult = {
  astrologySnapshotCanonical: Record<string, unknown>
  astrologySnapshotLocalized?: LocalizedAstrologySnapshot
}

let openaiClient: OpenAI | null = null

function requiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function getOpenAI() {
  if (openaiClient) return openaiClient

  openaiClient = new OpenAI({
    apiKey: requiredEnv("OPENAI_API_KEY"),
  })

  return openaiClient
}

function getTranslationModel() {
  return process.env.OPENAI_TRANSLATION_MODEL || process.env.OPENAI_MODEL || "gpt-5.4-mini"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function putSegment(segments: Record<string, string>, key: string, value: unknown) {
  if (typeof value !== "string") return
  const normalized = value.trim()
  if (!normalized) return
  segments[key] = normalized
}

function flattenStringLeaves(
  value: unknown,
  prefix: string,
  segments: Record<string, string>
) {
  if (typeof value === "string") {
    putSegment(segments, prefix, value)
    return
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      flattenStringLeaves(value[index], `${prefix}[${index}]`, segments)
    }
    return
  }

  if (!isRecord(value)) return

  for (const [key, nested] of Object.entries(value)) {
    flattenStringLeaves(nested, `${prefix}.${key}`, segments)
  }
}

function extractTranslatableSegments({
  natal,
  daily,
  compatibility,
}: {
  natal?: NatalChartData
  daily?: DailyHoroscopeData
  compatibility?: CompatibilityData
}) {
  const segments: Record<string, string> = {}

  if (natal?.summary.interpretations) {
    flattenStringLeaves(natal.summary.interpretations, "natal.interpretations", segments)
  }

  if (daily) {
    putSegment(segments, "daily.horoscopeData", daily.horoscopeData)
    if (daily.categories) {
      for (const [category, value] of Object.entries(daily.categories)) {
        putSegment(segments, `daily.categories.${category}`, value)
      }
    }
  }

  if (compatibility?.summary) {
    putSegment(segments, "compatibility.summary.emotional", compatibility.summary.emotional)
    putSegment(
      segments,
      "compatibility.summary.communication",
      compatibility.summary.communication
    )
    putSegment(segments, "compatibility.summary.attraction", compatibility.summary.attraction)
    putSegment(segments, "compatibility.summary.challenges", compatibility.summary.challenges)
  }

  if (compatibility?.personA?.summary.interpretations) {
    flattenStringLeaves(
      compatibility.personA.summary.interpretations,
      "compatibility.personA.interpretations",
      segments
    )
  }

  if (compatibility?.personB?.summary.interpretations) {
    flattenStringLeaves(
      compatibility.personB.summary.interpretations,
      "compatibility.personB.interpretations",
      segments
    )
  }

  return segments
}

function toTranslationHash({
  uid,
  segmentKey,
  sourceText,
}: {
  uid: string
  segmentKey: string
  sourceText: string
}) {
  return createHash("sha256")
    .update(`${uid}|en|ro|${segmentKey}|${sourceText}`)
    .digest("hex")
}

async function translateMisses({
  uid,
  misses,
}: {
  uid: string
  misses: TranslationSegmentEntry[]
}) {
  if (!misses.length) return {} as Record<string, string>

  const model = getTranslationModel()
  const response = await getOpenAI().responses.create({
    model,
    instructions:
      "Translate each segment to Romanian. Keep meaning exact. Keep numbers, zodiac references, degree values, and technical astrology values unchanged. Return JSON only.",
    input: JSON.stringify({
      targetLocale: "ro",
      segments: misses.map((item) => ({
        segmentKey: item.segmentKey,
        sourceText: item.sourceText,
      })),
    }),
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "divine_translation_segments",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            translations: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  segmentKey: { type: "string" },
                  translatedText: { type: "string" },
                },
                required: ["segmentKey", "translatedText"],
              },
            },
          },
          required: ["translations"],
        },
      },
    },
    max_output_tokens: 3200,
    metadata: {
      scope: "divine_translation_cache",
      uid,
      targetLocale: "ro",
    },
  })

  const raw = response.output_text
  if (!raw) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.translations)) {
    return {}
  }

  const translated: Record<string, string> = {}

  for (const item of parsed.translations) {
    if (!isRecord(item)) continue
    const segmentKey = typeof item.segmentKey === "string" ? item.segmentKey : null
    const translatedText =
      typeof item.translatedText === "string" ? item.translatedText.trim() : null
    if (!segmentKey || !translatedText) continue
    translated[segmentKey] = translatedText
  }

  return translated
}

async function resolveLocalizedSegments({
  uid,
  segments,
}: {
  uid: string
  segments: Record<string, string>
}) {
  const entries: TranslationSegmentEntry[] = Object.entries(segments).map(
    ([segmentKey, sourceText]) => ({
      segmentKey,
      sourceText,
      keyHash: toTranslationHash({ uid, segmentKey, sourceText }),
    })
  )

  if (!entries.length) return {} as Record<string, string>

  const refs = entries.map((entry) => getTranslationCacheRef(uid, entry.keyHash))
  const snapshots = await Promise.all(refs.map((ref) => ref.get()))
  const localized: Record<string, string> = {}
  const misses: TranslationSegmentEntry[] = []

  entries.forEach((entry, index) => {
    const snapshot = snapshots[index]
    if (!snapshot.exists) {
      misses.push(entry)
      return
    }

    const translatedText = snapshot.get("translatedText")
    if (typeof translatedText === "string" && translatedText.trim()) {
      localized[entry.segmentKey] = translatedText
    } else {
      misses.push(entry)
    }
  })

  const translatedMisses =
    misses.length > 0
      ? await translateMisses({
          uid,
          misses,
        })
      : {}

  for (const miss of misses) {
    localized[miss.segmentKey] = translatedMisses[miss.segmentKey] || miss.sourceText
  }

  const shouldWrite = entries.length > 0
  if (shouldWrite) {
    const batch = refs[0].firestore.batch()

    entries.forEach((entry, index) => {
      const snapshot = snapshots[index]
      if (snapshot.exists) {
        batch.set(
          refs[index],
          {
            hits: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
        return
      }

      batch.set(
        refs[index],
        {
          keyHash: entry.keyHash,
          segmentKey: entry.segmentKey,
          sourceText: entry.sourceText,
          translatedText: localized[entry.segmentKey],
          sourceLocale: "en",
          targetLocale: "ro",
          provider: "openai",
          model: getTranslationModel(),
          hits: 1,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    })

    await batch.commit()
  }

  return localized
}

function buildCanonicalSnapshot({
  natal,
  daily,
  compatibility,
}: {
  natal?: NatalChartData
  daily?: DailyHoroscopeData
  compatibility?: CompatibilityData
}) {
  const snapshot: Record<string, unknown> = {}

  if (natal?.summary) {
    snapshot.natal = {
      sunSign: natal.summary.sunSign ?? null,
      moonSign: natal.summary.moonSign ?? null,
      risingSign: natal.summary.risingSign ?? null,
      planets: natal.summary.planets ?? [],
      houses: natal.summary.houses ?? [],
      aspects: natal.summary.aspects ?? [],
    }
  }

  if (daily) {
    snapshot.daily = {
      date: daily.date ?? null,
      sign: daily.sign ?? null,
      horoscopeData: daily.horoscopeData ?? null,
      categories: daily.categories ?? {},
    }
  }

  if (compatibility) {
    snapshot.compatibility = {
      mode: compatibility.mode,
      summary: compatibility.summary ?? null,
      personA: compatibility.personA?.summary
        ? {
            sunSign: compatibility.personA.summary.sunSign ?? null,
            moonSign: compatibility.personA.summary.moonSign ?? null,
            risingSign: compatibility.personA.summary.risingSign ?? null,
          }
        : null,
      personB: compatibility.personB?.summary
        ? {
            sunSign: compatibility.personB.summary.sunSign ?? null,
            moonSign: compatibility.personB.summary.moonSign ?? null,
            risingSign: compatibility.personB.summary.risingSign ?? null,
          }
        : null,
    }
  }

  return snapshot
}

export async function translateDivineContent({
  uid,
  locale,
  natal,
  daily,
  compatibility,
}: {
  uid: string
  locale: "ro" | "en"
  natal?: NatalChartData
  daily?: DailyHoroscopeData
  compatibility?: CompatibilityData
}): Promise<TranslateDivineContentResult> {
  const astrologySnapshotCanonical = buildCanonicalSnapshot({
    natal,
    daily,
    compatibility,
  })

  if (locale !== "ro") {
    return { astrologySnapshotCanonical }
  }

  try {
    const segments = extractTranslatableSegments({
      natal,
      daily,
      compatibility,
    })

    if (Object.keys(segments).length === 0) {
      return { astrologySnapshotCanonical }
    }

    const translatedSegments = await resolveLocalizedSegments({
      uid,
      segments,
    })

    await logInfo("divineapi.translation", "divine_translation_resolved", {
      uid,
      totalSegments: Object.keys(segments).length,
      translatedSegments: Object.keys(translatedSegments).length,
    })

    return {
      astrologySnapshotCanonical,
      astrologySnapshotLocalized: {
        locale: "ro",
        segments: translatedSegments,
      },
    }
  } catch (error) {
    await logWarn("divineapi.translation", "divine_translation_failed_fallback_used", {
      uid,
      error,
    })
    await logError("divineapi.translation", "divine_translation_error", {
      uid,
      error,
    })
    return { astrologySnapshotCanonical }
  }
}
