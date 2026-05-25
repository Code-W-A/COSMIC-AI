import "server-only"

import type { DecodedIdToken } from "firebase-admin/auth"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { getAdminDb } from "@/lib/firebase/admin"
import { getNextMonthlyResetDate, getLimitForPlan } from "@/lib/subscription/limits"
import type { CosmicProfileDocument, UserDocument } from "@/types/user"

export function getUserRef(uid: string) {
  return getAdminDb().collection("users").doc(uid)
}

export function getCosmicProfileRef(uid: string) {
  return getUserRef(uid).collection("cosmicProfile").doc("main")
}

export function getBillingEventRef(uid: string, eventId: string) {
  return getUserRef(uid).collection("billingEvents").doc(eventId)
}

export function getInvoiceJobsCollection() {
  return getAdminDb().collection("invoiceJobs")
}

export function getInvoiceJobRef(stripeInvoiceId: string) {
  return getInvoiceJobsCollection().doc(stripeInvoiceId)
}

export function getInvoiceCorrectionsCollection() {
  return getAdminDb().collection("invoiceCorrections")
}

export function getInvoiceCorrectionRef(correctionId: string) {
  return getInvoiceCorrectionsCollection().doc(correctionId)
}

export function getSystemLockRef(lockName: string) {
  return getAdminDb().collection("systemLocks").doc(lockName)
}

export function getReadingsCollection(uid: string) {
  return getUserRef(uid).collection("readings")
}

export function getTranslationCacheCollection(uid: string) {
  return getUserRef(uid).collection("translationCache")
}

export function getTranslationCacheRef(uid: string, keyHash: string) {
  return getTranslationCacheCollection(uid).doc(keyHash)
}

export function getConversationsCollection(uid: string) {
  return getUserRef(uid).collection("conversations")
}

export function getConversationRef(uid: string, conversationId: string) {
  return getConversationsCollection(uid).doc(conversationId)
}

export function getConversationMessagesCollection(uid: string, conversationId: string) {
  return getConversationRef(uid, conversationId).collection("messages")
}

export function getDailyGuidanceRef(uid: string, dateKey: string) {
  return getUserRef(uid).collection("dailyGuidance").doc(dateKey)
}

export function getDailyGuidanceCollection(uid: string) {
  return getUserRef(uid).collection("dailyGuidance")
}

export function getPartnerRef(uid: string, partnerId?: string) {
  const collection = getUserRef(uid).collection("partners")
  return partnerId ? collection.doc(partnerId) : collection.doc()
}

export function getPartnersCollection(uid: string) {
  return getUserRef(uid).collection("partners")
}

export function getCompatibilityReadingsCollection(uid: string) {
  return getUserRef(uid).collection("compatibilityReadings")
}

export function getReportPurchasesCollection(uid: string) {
  return getUserRef(uid).collection("reportPurchases")
}

export function getReportPurchaseRef(uid: string, purchaseId?: string) {
  const collection = getReportPurchasesCollection(uid)
  return purchaseId ? collection.doc(purchaseId) : collection.doc()
}

export async function getUserDocument(uid: string) {
  const snapshot = await getUserRef(uid).get()

  if (!snapshot.exists) return null

  return snapshot.data() as UserDocument
}

export async function getCosmicProfile(uid: string) {
  const snapshot = await getCosmicProfileRef(uid).get()

  if (!snapshot.exists) return null

  return snapshot.data() as CosmicProfileDocument
}

async function deleteConversationMessages(uid: string, conversationId: string, pageSize = 200) {
  const messagesCollection = getConversationMessagesCollection(uid, conversationId)

  while (true) {
    const snapshot = await messagesCollection.limit(pageSize).get()
    if (snapshot.empty) break

    const batch = messagesCollection.firestore.batch()
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref)
    }
    await batch.commit()
  }
}

export async function deleteConversationCascade(uid: string, conversationId: string) {
  await deleteConversationMessages(uid, conversationId)
  await getConversationRef(uid, conversationId).delete()
}

export async function enforceFreeConversationLimit(uid: string, maxConversations: number) {
  const snapshot = await getConversationsCollection(uid)
    .orderBy("updatedAt", "desc")
    .get()

  if (snapshot.size <= maxConversations) {
    return
  }

  const overflow = snapshot.docs.slice(maxConversations)

  for (const doc of overflow) {
    await deleteConversationCascade(uid, doc.id)
  }
}

export async function createUserDocumentIfMissing(decodedToken: DecodedIdToken) {
  const userRef = getUserRef(decodedToken.uid)
  const snapshot = await userRef.get()

  if (snapshot.exists) {
    await userRef.set(
      {
        email: decodedToken.email ?? snapshot.get("email") ?? "",
        displayName: decodedToken.name ?? snapshot.get("displayName") ?? null,
        photoURL: decodedToken.picture ?? snapshot.get("photoURL") ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    return false
  }

  await userRef.create({
    uid: decodedToken.uid,
    email: decodedToken.email ?? "",
    displayName: decodedToken.name ?? null,
    photoURL: decodedToken.picture ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    subscriptionStatus: "free",
    subscriptionPlan: "free",
    monthlyQuestionCount: 0,
    monthlyQuestionLimit: getLimitForPlan("free"),
    monthlyUsageResetAt: Timestamp.fromDate(getNextMonthlyResetDate()),
  })

  return true
}
