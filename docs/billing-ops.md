# Billing Ops: Stripe + Oblio + Retry Cron

## Required environment variables

### Next.js app (billing runtime)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OBLIO_CLIENT_ID`
- `OBLIO_CLIENT_SECRET`
- `OBLIO_CIF`
- `OBLIO_SERIES_NAME` (or fallback `OBLIO_SERIES`)
- `OBLIO_RETRY_SECRET`

### Firebase scheduled function
- `OBLIO_RETRY_SECRET`
- `COSMIC_BILLING_RETRY_URL` (full URL to `/api/internal/oblio/retry`)
  or
- `COSMIC_APP_BASE_URL` (function builds `/api/internal/oblio/retry` automatically)

## Deploy Firebase cron

```bash
cd functions
npm install
npm run build
npm run deploy
```

This deploys `oblioRetryCron` on schedule `every 10 minutes` in timezone `Europe/Bucharest`.

## Health checks

1. Confirm scheduler invocation in Cloud Functions logs:
   - message: `oblio_retry_cron_completed`
2. Confirm API logs from Next.js:
   - scope: `oblio.retry`
   - unauthorized calls should be absent
3. Confirm lock behavior under overlap:
   - response includes `skippedDueToLock: true` on overlap
4. Confirm invoice jobs flow:
   - Firestore collection `invoiceJobs`
   - status transitions: `pending -> issued` or `pending -> failed`

## Manual trigger (safe)

Use the internal endpoint with secret header.

```bash
curl -X POST "https://<your-app>/api/internal/oblio/retry" \
  -H "content-type: application/json" \
  -H "x-oblio-retry-secret: <OBLIO_RETRY_SECRET>" \
  -d '{"limit":50}'
```
