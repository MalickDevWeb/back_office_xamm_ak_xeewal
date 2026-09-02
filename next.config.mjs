import { withSentryConfig } from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || 'https://2fbcffec5a5f1c0b0423f2ad48264833@o4512013434683392.ingest.de.sentry.io/4512013443530832';
const SENTRY_ORG = process.env.SENTRY_ORG || 'jamm-ak-xeewal';
const SENTRY_PROJECT = process.env.SENTRY_PROJECT || 'javascript-nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // CORS is handled entirely by middleware.ts (dynamic origin support)
};

// Sentry wrapper pour Next.js (build + source maps)
export default withSentryConfig(nextConfig, {
  org: SENTRY_ORG,
  project: SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
