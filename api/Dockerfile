# syntax=docker/dockerfile:1

# ---- Stage 1: builder ----
# Instala todas as dependencias (incluindo devDependencies), gera o Prisma
# Client e compila o TypeScript para dist/.
FROM node:20-alpine AS builder

WORKDIR /app

# OpenSSL e libc6-compat sao necessarios para o Prisma funcionar
# corretamente em imagens Alpine (evita erro "Could not parse schema
# engine response" ao rodar prisma migrate deploy / generate).
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

RUN npm run build

# ---- Stage 2: runner ----
# Imagem final limpa, apenas com dependencias de producao e os artefatos
# necessarios para executar a API (dist/, prisma/ e o client gerado).
FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./
COPY --from=builder /app/prisma ./prisma
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3333

CMD ["node", "dist/index.js"]