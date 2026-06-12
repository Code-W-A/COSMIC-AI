import "server-only"

import { parsePartnerBirthDetails } from "@/lib/agents/context"
import { getPartnerRef, getPartnersCollection } from "@/lib/firebase/firestore"
import { getPartnerInputCompleteness } from "@/lib/profile/input-policy"
import type { BirthDetails } from "@/lib/divineapi/types"

type PartnerBody = {
  birthDate?: string
  birthTime?: string
  birthPlace?: string
  sexAtBirth?: string
  name?: string
}

function isCompletePartnerInput(input: PartnerBody | null | undefined) {
  return getPartnerInputCompleteness(input, "astrology_compatibility").isComplete
}

export async function resolveCompatibilityPartnerForChat(
  uid: string,
  body: Record<string, unknown>
): Promise<{ partner: BirthDetails; partnerBody: Record<string, unknown> } | null> {
  const inlinePartner =
    body.partner && typeof body.partner === "object"
      ? (body.partner as PartnerBody & Record<string, unknown>)
      : null

  if (inlinePartner && isCompletePartnerInput(inlinePartner)) {
    const partner = parsePartnerBirthDetails(inlinePartner)
    if (partner) {
      return { partner, partnerBody: inlinePartner }
    }
  }

  const partnerId =
    typeof body.partnerId === "string" && body.partnerId.trim() ? body.partnerId.trim() : null

  if (partnerId) {
    const partnerSnapshot = await getPartnerRef(uid, partnerId).get()
    if (partnerSnapshot.exists) {
      const partner = parsePartnerBirthDetails(partnerSnapshot.data())
      if (partner && isCompletePartnerInput(partnerSnapshot.data() as PartnerBody)) {
        return {
          partner,
          partnerBody: partnerSnapshot.data() as Record<string, unknown>,
        }
      }
    }
  }

  const partnersSnapshot = await getPartnersCollection(uid)
    .orderBy("updatedAt", "desc")
    .limit(5)
    .get()

  for (const doc of partnersSnapshot.docs) {
    const data = doc.data() as PartnerBody
    if (!isCompletePartnerInput(data)) continue

    const partner = parsePartnerBirthDetails(data)
    if (!partner) continue

    return {
      partner,
      partnerBody: data as Record<string, unknown>,
    }
  }

  return null
}
