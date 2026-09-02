import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || 'https://2fbcffec5a5f1c0b0423f2ad48264833@o4512013434683392.ingest.de.sentry.io/4512013443530832';
const SENTRY_ENV = process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENV,
  release: 'bac-office@' + (process.env.npm_package_version || '1.0.0'),

  tracesSampleRate: SENTRY_ENV === 'production' ? 0.2 : 1.0,

  ignoreErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
  ],

  beforeSend(event) {
    // Nettoyer les donnees sensibles
    if (event.request && event.request.cookies) {
      delete event.request.cookies;
    }
    if (event.request && event.request.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.Authorization;
    }
    return event;
  },
});
