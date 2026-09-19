# DOCSEDITZ API
FROM node:20-bookworm-slim

# LibreOffice powers Office -> PDF conversion; fonts improve output fidelity
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice --no-install-suggests \
    fonts-dejavu fonts-liberation \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci

# Copy Prisma files
COPY prisma ./prisma
COPY prisma7.config.ts ./prisma7.config.ts

# Generate Prisma Client
RUN npx prisma generate

# Copy application source
COPY src ./src

ENV NODE_ENV=production

EXPOSE 5000

USER node

CMD ["npx", "tsx", "src/server.js"]