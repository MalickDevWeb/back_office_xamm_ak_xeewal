# Étape 1 : Build
FROM node:20-bookworm AS builder
WORKDIR /app

# Copie du .env pour le build
COPY .env.local ./

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm install prisma@5.22.0 @prisma/client@5.22.0 --no-save
RUN npx prisma generate
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN npm run build

# Étape 2 : Image finale
FROM node:20-bookworm AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/node_modules ./node_modules

# Secrets injectés à l'exécution
ENV DATABASE_URL=""
ENV JWT_SECRET=""
ENV CORS_ORIGINS=""
ENV CLOUDINARY_CLOUD_NAME=""
ENV CLOUDINARY_API_KEY=""
ENV CLOUDINARY_API_SECRET=""
ENV VAPID_PUBLIC_KEY=""
ENV VAPID_PRIVATE_KEY=""
ENV VAPID_SUBJECT=""

EXPOSE 3001
CMD ["npx", "next", "start", "-p", "3001"]
