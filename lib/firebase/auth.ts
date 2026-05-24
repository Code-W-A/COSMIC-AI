"use client"

import type { FirebaseError } from "firebase/app"
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  linkWithCredential,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth"

import { getFirebaseAuth } from "@/lib/firebase/client"

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
    const authError = error as { code?: string; customData?: { email?: string } }

    if (authError?.code !== "auth/account-exists-with-different-credential") {
      throw error
    }

    const pendingCredential = GoogleAuthProvider.credentialFromError(error as FirebaseError)
    const pendingEmail = authError.customData?.email ?? emailHint

    if (!pendingCredential || !pendingEmail) {
      throw new Error(
        "This email is linked to another sign-in method. Sign in with that method first, then retry Google."
      )
    }

    const providers = await fetchSignInMethodsForEmail(auth, pendingEmail)

    if (!providers.includes("password")) {
      throw new Error(
        "This email is linked to another sign-in method. Sign in with that provider first, then retry Google."
      )
    }

    if (!passwordForLinking) {
      throw new Error(
        "This email already has a password account. Sign in with password once, then click Continue with Google again."
      )
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
