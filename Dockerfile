# Full-stack DOCSEDITZ image for Railway (API + static React app on one port)

FROM node:20-alpine AS client-build
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
ARG VITE_API_URL=/api/v1
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

FROM node:20-bookworm-slim AS server
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice --no-install-suggests \
    fonts-dejavu fonts-liberation \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package*.json ./
RUN npm ci

COPY server/prisma ./prisma
COPY server/prisma7.config.ts ./prisma7.config.ts
RUN npx prisma generate

COPY server/src ./src
COPY server/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

COPY --from=client-build /client/dist ./public

ENV NODE_ENV=production
ENV SERVE_WEB=true

EXPOSE 5000

USER node

CMD ["./docker-entrypoint.sh"]
