import "server-only"

import { getCosmicProfileRef, getUserRef } from "@/lib/firebase/firestore"

export async function getAccountDataSnapshot(uid: string) {
  const userRef = getUserRef(uid)
  const cosmicRef = getCosmicProfileRef(uid)
  const [userSnap, cosmicSnap] = await Promise.all([userRef.get(), cosmicRef.get()])

  const cosmicData = cosmicSnap.exists ? cosmicSnap.data() : null

  return {
    userDocExists: userSnap.exists,
    cosmicProfileExists: cosmicSnap.exists,
    hasNatalSummary: Boolean(
      cosmicData &&
        typeof cosmicData === "object" &&
        "natalSummary" in cosmicData &&
        cosmicData.natalSummary
    ),
    profileFieldFlags: cosmicData
      ? {
          hasName: typeof cosmicData.name === "string" && cosmicData.name.trim().length > 0,
          hasBirthDate:
            typeof cosmicData.birthDate === "string" && cosmicData.birthDate.trim().length > 0,
          hasBirthTime:
            typeof cosmicData.birthTime === "string" && cosmicData.birthTime.trim().length > 0,
          hasBirthPlace:
            typeof cosmicData.birthPlace === "string" && cosmicData.birthPlace.trim().length > 0,
          hasSexAtBirth: typeof cosmicData.sexAtBirth === "string",
          hasMainFocus: typeof cosmicData.mainFocus === "string",
        }
      : null,
  }
}
