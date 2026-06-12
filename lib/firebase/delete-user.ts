import "server-only"

import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin"
import { getAccountDataSnapshot } from "@/lib/firebase/account-snapshot"
import { getUserRef } from "@/lib/firebase/firestore"
import { logError, logInfo } from "@/lib/logging/logger"

export async function deleteUserDataCascade(uid: string) {
  const userRef = getUserRef(uid)
  await getAdminDb().recursiveDelete(userRef)

  const afterFirestoreDelete = await getAccountDataSnapshot(uid)
  await logInfo("account", "account.delete_firestore_completed", {
    uid,
    ...afterFirestoreDelete,
  })

  if (afterFirestoreDelete.userDocExists || afterFirestoreDelete.cosmicProfileExists) {
    throw new Error("Firestore user data still exists after recursiveDelete.")
  }
}

export async function deleteUserAuthAccount(uid: string) {
  await getAdminAuth().deleteUser(uid)
  await logInfo("account", "account.delete_auth_completed", { uid })
}

export async function deleteUserAccountFully(uid: string) {
  try {
    const beforeDelete = await getAccountDataSnapshot(uid)
    await logInfo("account", "account.delete_precheck", {
      uid,
      ...beforeDelete,
    })

    await deleteUserDataCascade(uid)
    await deleteUserAuthAccount(uid)
    await logInfo("account", "account.delete_completed", { uid })
  } catch (error) {
    await logError("account", "account.delete_failed", { uid, error })
    throw error
  }
}
