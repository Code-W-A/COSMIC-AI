"use client"

import type { FirebaseError } from "firebase/app"
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth"

import { apiFetch } from "@/lib/api/client"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { logClientEvent } from "@/lib/logging/client-log"
import type { Locale } from "@/lib/i18n/locale"

function createAuthCodeError(code: string): Error & { code: string } {
  const error = new Error(code) as Error & { code: string }
  error.code = code
  return error
}

async function createBackendUserDocument() {
  const auth = getFirebaseAuth()
  const token = await auth.currentUser?.getIdToken()

  if (!token) {
    throw new Error("Unable to create user profile without an authenticated user.")
  }

  const response = await fetch("/api/auth/create-user", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Unable to create your user profile.")
  }

  return payload
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
) {
  const auth = getFirebaseAuth()
  const credential = await createUserWithEmailAndPassword(auth, email, password)

  if (displayName?.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() })
  }

  await createBackendUserDocument()

  return credential.user
}

export async function loginWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth()
  const credential = await signInWithEmailAndPassword(auth, email, password)
  await createBackendUserDocument()
  return credential.user
}

export async function loginWithGoogle(emailHint?: string, passwordForLinking?: string) {
  const auth = getFirebaseAuth()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: "select_account" })

  try {
    const credential = await signInWithPopup(auth, provider)
    await createBackendUserDocument()
    return credential.user
  } catch (error) {
    const caughtError = error as { code?: string; customData?: { email?: string } }

    if (caughtError?.code !== "auth/account-exists-with-different-credential") {
      throw error
    }

    const pendingCredential = GoogleAuthProvider.credentialFromError(error as FirebaseError)
    const pendingEmail = caughtError.customData?.email ?? emailHint

    if (!pendingCredential || !pendingEmail) {
      throw createAuthCodeError("auth/google-account-exists")
    }

    const providers = await fetchSignInMethodsForEmail(auth, pendingEmail)

    if (!providers.includes("password")) {
      throw createAuthCodeError("auth/google-other-provider")
    }

    if (!passwordForLinking) {
      throw createAuthCodeError("auth/google-password-required")
    }

    const emailCredential = await signInWithEmailAndPassword(auth, pendingEmail, passwordForLinking)
    await linkWithCredential(emailCredential.user, pendingCredential)
    await createBackendUserDocument()
    return emailCredential.user
  }
}

export async function registerOrLoginWithGoogle(emailHint?: string, passwordForLinking?: string) {
  return loginWithGoogle(emailHint, passwordForLinking)
}

export async function logout() {
  await signOut(getFirebaseAuth())
}

function userHasPasswordProvider() {
  const user = getFirebaseAuth().currentUser
  return user?.providerData.some((provider) => provider.providerId === "password") ?? false
}

export async function deleteAccount(options?: { password?: string }) {
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  const email = user?.email?.trim().toLowerCase()

  if (!user || !email) {
    throw createAuthCodeError("auth/delete-account-not-signed-in")
  }

  if (userHasPasswordProvider()) {
    if (!options?.password?.trim()) {
      throw createAuthCodeError("auth/delete-account-password-required")
    }

    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(email, options.password)
    )
  } else {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: "login" })
    await reauthenticateWithPopup(user, provider)
  }

  logClientEvent("account", "account.delete_client_started", {
    uid: user.uid,
    email,
    providers: user.providerData.map((provider) => provider.providerId),
  })

  await apiFetch("/api/user/account", {
    method: "DELETE",
  })

  logClientEvent("account", "account.delete_client_completed", {
    uid: user.uid,
    email,
  })

  await signOut(auth)
}

export async function sendPasswordReset(email: string, locale: Locale) {
  const auth = getFirebaseAuth()
  auth.languageCode = locale
  const origin = typeof window !== "undefined" ? window.location.origin : ""

  await sendPasswordResetEmail(auth, email.trim(), {
    url: `${origin}/${locale}/login`,
    handleCodeInApp: false,
  })
}
