import "server-only"

import nodemailer from "nodemailer"

import type { ContactTopic } from "@/lib/support/contact-topics"
import { getContactTopicLabel } from "@/lib/support/contact-topics"

export class SupportEmailNotConfiguredError extends Error {
  constructor() {
    super("Support email is not configured.")
    this.name = "SupportEmailNotConfiguredError"
  }
}

export interface SendSupportEmailInput {
  topic: ContactTopic
  message: string
  userEmail: string
  userName: string
  userId: string
  locale: "en" | "ro"
}

function isE2EMockEnabled() {
  return process.env.E2E_MOCK_EXTERNALS === "1"
}

function getSmtpConfig() {
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_APP_PASSWORD?.trim()

  if (!user || !pass) {
    return null
  }

  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com"
  const port = Number(process.env.SMTP_PORT || "587")

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: false,
    auth: { user, pass },
  }
}

function getSupportEmailTo() {
  return process.env.SUPPORT_EMAIL_TO?.trim() || "webdynamicx@gmail.com"
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export async function sendSupportEmail(input: SendSupportEmailInput) {
  if (isE2EMockEnabled()) {
    return { mocked: true as const }
  }

  const smtpConfig = getSmtpConfig()
  if (!smtpConfig) {
    throw new SupportEmailNotConfiguredError()
  }

  const topicLabel = getContactTopicLabel(input.topic, input.locale)
  const senderName = input.userName.trim() || input.userEmail
  const subject = `[AstroAI Support] ${topicLabel} — ${senderName}`
  const sentAt = new Date().toISOString()
  const to = getSupportEmailTo()

  const textBody = [
    "New support message from AstroAI account",
    "",
    `Topic: ${topicLabel}`,
    `User: ${senderName}`,
    `Email: ${input.userEmail}`,
    `User ID: ${input.userId}`,
    `Locale: ${input.locale}`,
    `Sent at: ${sentAt}`,
    "",
    "Message:",
    input.message,
  ].join("\n")

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">New support message from AstroAI account</h2>
      <p><strong>Topic:</strong> ${escapeHtml(topicLabel)}</p>
      <p><strong>User:</strong> ${escapeHtml(senderName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(input.userEmail)}</p>
      <p><strong>User ID:</strong> ${escapeHtml(input.userId)}</p>
      <p><strong>Locale:</strong> ${escapeHtml(input.locale)}</p>
      <p><strong>Sent at:</strong> ${escapeHtml(sentAt)}</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;" />
      <p style="white-space: pre-wrap;">${escapeHtml(input.message)}</p>
    </div>
  `.trim()

  const transporter = nodemailer.createTransport(smtpConfig)

  await transporter.sendMail({
    from: `"AstroAI Support" <${smtpConfig.auth.user}>`,
    to,
    replyTo: input.userEmail,
    subject,
    text: textBody,
    html: htmlBody,
  })

  return { mocked: false as const }
}
