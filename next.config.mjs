// import { withSentryConfig } from '@sentry/nextjs'; // Sentry désactivé temporairement

/** @type {import('next').NextConfig} */
const nextConfig = {
  // CORS is handled entirely by middleware.ts (dynamic origin support)
};

// Sentry désactivé temporairement — réactiver en décommentant withSentryConfig
// export default withSentryConfig(nextConfig, {
//   org: process.env.SENTRY_ORG || 'jamm-ak-xeewal',
//   project: process.env.SENTRY_PROJECT || 'javascript-nextjs',
//   silent: !process.env.CI,
//   widenClientFileUpload: true,
//   hideSourceMaps: true,
//   disableLogger: true,
// });

export default nextConfig;
