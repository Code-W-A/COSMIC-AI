import * as Sentry from "@sentry/nextjs"

import { getSharedSentryOptions } from "@/lib/sentry/config"

Sentry.init(getSharedSentryOptions())
