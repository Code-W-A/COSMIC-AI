import { initializeApp, getApps } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore"

const TEST_PASSWORD = "AstroE2E!234"

const USERS = {
  fresh: {
    uid: "e2e-fresh-user",
    email: "fresh.e2e@astroai.local",
    password: TEST_PASSWORD,
    displayName: "Fresh E2E User",
  },
  existing: {
    uid: "e2e-existing-user",
    email: "existing.e2e@astroai.local",
    password: TEST_PASSWORD,
    displayName: "Existing E2E User",
  },
  deletable: {
    uid: "e2e-deletable-user",
    email: "deletable.e2e@astroai.local",
    password: TEST_PASSWORD,
    displayName: "Deletable E2E User",
  },
}

function getProjectId() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ""
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required for E2E seed/reset.")
  }
  if (!projectId.startsWith("demo-")) {
    throw new Error(`Unsafe project id "${projectId}". E2E requires demo-* project id.`)
  }
  return projectId
}

function assertEmulatorEnv() {
  if (process.env.E2E_USE_FIREBASE_EMULATORS !== "1") {
    throw new Error("E2E_USE_FIREBASE_EMULATORS must be 1.")
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("FIREBASE_AUTH_EMULATOR_HOST must be set.")
  }
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("FIRESTORE_EMULATOR_HOST must be set.")
  }
}

function getAdmin() {
  assertEmulatorEnv()
  const projectId = getProjectId()
  process.env.GCLOUD_PROJECT = projectId

  if (!getApps().length) {
    initializeApp({ projectId })
  }

  return {
    auth: getAuth(),
    db: getFirestore(),
    projectId,
  }
}

async function clearFirestore(db) {
  const usersCollection = db.collection("users")
  const userDocs = await usersCollection.listDocuments()

  for (const userRef of userDocs) {
    await db.recursiveDelete(userRef)
  }
}

async function clearAuth(auth) {
  let nextPageToken = undefined
  do {
    const page = await auth.listUsers(1000, nextPageToken)
    await Promise.all(page.users.map((user) => auth.deleteUser(user.uid)))
    nextPageToken = page.pageToken
  } while (nextPageToken)
}

function profilePayload(name) {
  return {
    name,
    birthDate: "1994-06-14",
    birthTime: "08:45",
    birthPlace: "Bucharest, Romania",
    birthPlacePlaceId: "e2e-bucharest",
    sexAtBirth: "female",
    mainFocus: "love",
    latitude: 44.4268,
    longitude: 26.1025,
    timezoneIana: "Europe/Bucharest",
    timezoneOffsetAtBirth: 3,
    timezoneOffsetNow: 3,
    divineNatalRaw: { mocked: true, source: "seed" },
    natalSummary: {
      sunSign: "Gemini",
      moonSign: "Virgo",
      risingSign: "Libra",
      planets: [{ name: "Sun", sign: "Gemini", house: "10", degree: "12.5°" }],
      houses: [{ house: "1", sign: "Libra" }],
      aspects: [{ aspect: "Trine", between: "Sun-Moon" }],
    },
    sunSign: "Gemini",
    moonSign: "Virgo",
    risingSign: "Libra",
    natalChartGeneratedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }
}

async function seedUser(auth, db, user) {
  await auth.createUser({
    uid: user.uid,
    email: user.email,
    password: user.password,
    displayName: user.displayName,
    emailVerified: true,
  })

  await db.collection("users").doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    subscriptionStatus: "free",
    subscriptionPlan: "free",
    monthlyQuestionCount: 0,
    monthlyQuestionLimit: 100,
    monthlyUsageResetAt: Timestamp.fromDate(new Date("2099-01-01T00:00:00.000Z")),
  })
}

async function seedExistingUserData(db, uid) {
  await db.collection("users").doc(uid).collection("cosmicProfile").doc("main").set(profilePayload("Existing E2E User"))

  const conversationRef = db.collection("users").doc(uid).collection("conversations").doc("e2e-seeded-conversation")
  await conversationRef.set({
    title: "Seeded conversation",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastMessagePreview: "Mocked love answer for: I need guidance.",
    agentType: "love",
    messageCount: 2,
  })

  await conversationRef.collection("messages").doc("e2e-user-message").set({
    role: "user",
    content: "I need guidance.",
    agentType: "love",
    createdAt: FieldValue.serverTimestamp(),
  })

  await conversationRef.collection("messages").doc("e2e-assistant-message").set({
    role: "assistant",
    content: "Mocked love answer for: I need guidance.",
    agentType: "love",
    createdAt: FieldValue.serverTimestamp(),
    model: "mock-e2e-model",
    tokensUsed: 42,
  })

  await db.collection("users").doc(uid).collection("readings").doc("e2e-reading").set({
    agentType: "love",
    question: "I need guidance.",
    answer: "Mocked love answer for: I need guidance.",
    cards: [],
    followUpQuestions: [],
    usedAstrologyData: { natal: true, daily: false, compatibility: false },
    model: "mock-e2e-model",
    tokensUsed: 42,
    isPremium: false,
    locale: "en",
    createdAt: FieldValue.serverTimestamp(),
  })
}

export async function resetEmulatorData() {
  const { auth, db } = getAdmin()
  await clearFirestore(db)
  await clearAuth(auth)
}

export async function seedEmulatorData() {
  const { auth, db } = getAdmin()

  await seedUser(auth, db, USERS.fresh)
  await seedUser(auth, db, USERS.existing)
  await seedUser(auth, db, USERS.deletable)
  await seedExistingUserData(db, USERS.existing.uid)
  await seedExistingUserData(db, USERS.deletable.uid)

  await db.collection("users").doc(USERS.existing.uid).set(
    {
      subscriptionStatus: "active",
      subscriptionPlan: "premium",
      cancelAtPeriodEnd: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

export async function resetAndSeed() {
  await resetEmulatorData()
  await seedEmulatorData()
}

export function getE2ECredentials() {
  return USERS
}
