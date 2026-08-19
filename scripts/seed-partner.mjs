import { existsSync, readFileSync } from "node:fs"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { FieldValue, getFirestore } from "firebase-admin/firestore"

function loadDotEnv(path = ".env") {
  if (!existsSync(path)) return
  const content = readFileSync(path, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue
    const index = trimmed.indexOf("=")
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value.replace(/\\n/g, "\n")
  }
}

function argValue(name, fallback) {
  const prefix = `--${name}=`
  const match = process.argv.find((item) => item.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

loadDotEnv()

const code = String(argValue("code", "cristina")).trim().toLowerCase()
const name = argValue("name", "Cristina Malaeru")
const email = String(argValue("email", "office@cristinamalaeru.ro")).trim().toLowerCase()
const commissionPercent = Number(argValue("commission", "20"))
const discountPercent = Number(argValue("discount", "20"))

function requiredEnv(key) {
  const value = process.env[key]
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: requiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()
const auth = getAuth()

await db.collection("partners").doc(code).set(
  {
    code,
    name,
    email,
    status: "active",
    grantPremium: true,
    commissionPercent,
    discountPercent,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  },
  { merge: true }
)

const users = await db.collection("users").where("email", "==", email).limit(5).get()
let grantedUid = null

for (const doc of users.docs) {
  await doc.ref.set(
    {
      subscriptionStatus: "active",
      subscriptionPlan: "premium",
      subscriptionInterval: null,
      premiumSource: "complimentary_partner",
      complimentaryPartnerCode: code,
      monthlyQuestionLimit: 120,
      cancelAtPeriodEnd: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
  grantedUid = doc.id
}

if (!grantedUid) {
  try {
    const record = await auth.getUserByEmail(email)
    grantedUid = record.uid
    await db.collection("users").doc(record.uid).set(
      {
        uid: record.uid,
        email,
        displayName: record.displayName ?? name,
        subscriptionStatus: "active",
        subscriptionPlan: "premium",
        subscriptionInterval: null,
        premiumSource: "complimentary_partner",
        complimentaryPartnerCode: code,
        monthlyQuestionCount: 0,
        monthlyQuestionLimit: 120,
        cancelAtPeriodEnd: false,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  } catch {
    // Partner has not created an account yet; Premium will be granted at signup.
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      partner: { code, name, email, sharePath: `/r/${code}` },
      complimentaryPremiumUid: grantedUid,
      note: grantedUid
        ? "Complimentary Premium granted to existing account."
        : "No account yet. Premium will be granted when this email registers or logs in.",
    },
    null,
    2
  )
)
