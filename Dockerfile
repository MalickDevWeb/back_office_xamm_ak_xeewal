# ============================================
# JAMM AK XEEWAL — Backend Dockerfile
# Next.js API + Prisma + Cloudinary
# ============================================

FROM node:20-alpine AS base

# Installer les dépendances nécessaires
RUN apk add --no-cache libc6-compat openssl

# Étape de dépendances
FROM base AS deps
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./
RUN npm ci

# Étape de build
FROM base AS builder
WORKDIR /app

# Copier les dépendances installées
COPY --from=deps /app/node_modules ./node_modules

# Copier le code source
COPY . .

# Générer Prisma
RUN npx prisma generate

# Builder l'application Next.js
RUN npm run build

# Étape de production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Créer un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copier les fichiers de build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Changer vers l'utilisateur non-root
USER nextjs

# Exposer le port
EXPOSE 3001

# Variables d'environnement par défaut (peuvent être surchargées)
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Démarrer l'application
CMD ["npm", "start"]
