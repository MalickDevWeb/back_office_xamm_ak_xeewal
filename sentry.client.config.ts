// Sentry désactivé temporairement
// Pour réactiver, décommenter le code ci-dessous et configurer SENTRY_DSN dans les variables d'env Vercel

// import * as Sentry from '@sentry/nextjs';
//
// Sentry.init({
//   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
//   environment: process.env.NODE_ENV || 'development',
//   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
//   ignoreErrors: [
//     'ResizeObserver loop limit exceeded',
//     'Non-Error promise rejection captured',
//   ],
// });
