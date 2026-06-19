import "server-only"

import { getCompatibilityReadingsCollection } from "@/lib/firebase/firestore"
import { logInfo } from "@/lib/logging/logger"

const BATCH_DELETE_LIMIT = 400

export async function invalidateDerivedAstrologyData(uid: string) {
  const collection = getCompatibilityReadingsCollection(uid)
  let deletedCount = 0

  while (true) {
    const snapshot = await collection.limit(BATCH_DELETE_LIMIT).get()
    if (snapshot.empty) break

    const batch = collection.firestore.batch()
    snapshot.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
    deletedCount += snapshot.size

    if (snapshot.size < BATCH_DELETE_LIMIT) break
  }

  await logInfo("profile", "astro_inputs_changed", {
    uid,
    deletedCompatibilityReadings: deletedCount,
  })

  return { deletedCompatibilityReadings: deletedCount }
}
