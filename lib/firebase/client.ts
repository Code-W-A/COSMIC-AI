"use client"

import { getApp, getApps, initializeApp } from "firebase/app"
import { connectAuthEmulator, getAuth } from "firebase/auth"
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const db = getFirestore(firebaseApp)

const USE_EMULATORS = process.env.NEXT_PUBLIC_E2E_USE_FIREBASE_EMULATORS === "1"
const AUTH_EMULATOR_HOST =
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"
const FIRESTORE_EMULATOR_HOST =
  process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"

let emulatorsConnected = false

function parseEmulatorHost(host: string) {
  const [hostname, portRaw] = host.split(":")
  const port = Number(portRaw)
  return {
    hostname: hostname || "127.0.0.1",
    port: Number.isFinite(port) ? port : 8080,
  }
}

function connectFirebaseEmulatorsIfEnabled() {
  if (!USE_EMULATORS || emulatorsConnected) return

  const auth = getAuth(firebaseApp)
  connectAuthEmulator(auth, `http://${AUTH_EMULATOR_HOST}`, { disableWarnings: true })

  const parsed = parseEmulatorHost(FIRESTORE_EMULATOR_HOST)
  connectFirestoreEmulator(db, parsed.hostname, parsed.port)

  emulatorsConnected = true
}

export function hasFirebaseClientConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  )
}

export function getFirebaseAuth() {
  if (!hasFirebaseClientConfig()) {
    throw new Error("Missing Firebase client configuration. Check .env.local.")
  }

  connectFirebaseEmulatorsIfEnabled()
  return getAuth(firebaseApp)
}
