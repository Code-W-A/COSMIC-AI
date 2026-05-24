"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oblioRetryCron = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
function requiredEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function getRetryEndpointUrl() {
    const explicit = process.env.COSMIC_BILLING_RETRY_URL?.trim();
    if (explicit)
        return explicit;
    const baseUrl = process.env.COSMIC_APP_BASE_URL?.trim();
    if (!baseUrl) {
        throw new Error("Missing required environment variable: COSMIC_BILLING_RETRY_URL or COSMIC_APP_BASE_URL");
    }
    const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${trimmedBase}/api/internal/oblio/retry`;
}
exports.oblioRetryCron = (0, scheduler_1.onSchedule)({
    schedule: "every 10 minutes",
    timeZone: "Europe/Bucharest",
    region: "europe-west1",
    timeoutSeconds: 540,
    memory: "256MiB",
    retryCount: 1,
}, async () => {
    const retrySecret = requiredEnv("OBLIO_RETRY_SECRET");
    const retryUrl = getRetryEndpointUrl();
    const response = await fetch(retryUrl, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-oblio-retry-secret": retrySecret,
        },
        body: JSON.stringify({ limit: 50 }),
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        firebase_functions_1.logger.error("oblio_retry_cron_failed", {
            status: response.status,
            statusText: response.statusText,
            body: body.slice(0, 300),
        });
        throw new Error(`Oblio retry endpoint failed with status ${response.status}`);
    }
    const payload = await response.json().catch(() => null);
    firebase_functions_1.logger.info("oblio_retry_cron_completed", {
        processed: payload && typeof payload === "object" ? payload.processed : undefined,
        skippedDueToLock: payload && typeof payload === "object"
            ? payload.skippedDueToLock
            : undefined,
    });
});
//# sourceMappingURL=index.js.map