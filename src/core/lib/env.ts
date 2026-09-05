/**
 * Valide la présence des variables d'environnement critiques.
 * Lance une erreur au démarrage si une variable obligatoire est manquante.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value.trim();
}

/**
 * Retourne une variable d'environnement ou une valeur par défaut.
 */
function getEnv(name: string, defaultValue: string = ''): string {
  return (process.env[name] || defaultValue).trim();
}

export const config = {
  // Base de données
  databaseUrl: requireEnv('DATABASE_URL'),
  directUrl: getEnv('DIRECT_URL'),

  // Authentification
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '1d'),

  // App
  appUrl: getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3001'),

  // CORS
  corsOrigins: getEnv('CORS_ORIGINS', 'http://localhost:4200'),

  // Stockage (Cloudinary)
  cloudinaryCloudName: requireEnv('CLOUDINARY_CLOUD_NAME'),
  cloudinaryApiKey: requireEnv('CLOUDINARY_API_KEY'),
  cloudinaryApiSecret: requireEnv('CLOUDINARY_API_SECRET'),

  // Web Push (VAPID)
  vapidPublicKey: requireEnv('VAPID_PUBLIC_KEY'),
  vapidPrivateKey: requireEnv('VAPID_PRIVATE_KEY'),
  vapidSubject: getEnv('VAPID_SUBJECT', 'mailto:contact@jammakxeewal.sn'),

  // Sentry
  sentryDsn: getEnv('SENTRY_DSN', ''),
  sentryAuthToken: getEnv('VITE_SENTRY_AUTH_TOKEN', ''),

  // Email de contact public (pour les notifications push, etc.)
  publicContactEmail: getEnv('PUBLIC_CONTACT_EMAIL', 'contact@jammakxeewal.sn'),

  // URL publique du site (pour les icônes, liens, etc.)
  publicSiteUrl: getEnv('PUBLIC_SITE_URL', 'https://jammakxeewal.sn'),

  // Environnement
  nodeEnv: getEnv('NODE_ENV', 'development'),
};

export default config;
