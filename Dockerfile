FROM node:20-alpine AS build
WORKDIR /app

# Native deps for better-sqlite3 / argon2 builds
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  libc6-compat

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/docksentinel-web/package.json apps/docksentinel-web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci
# Work around npm optionalDependencies bug for native binaries in cross-platform Docker builds.
RUN ROLLUP_VERSION=$(node -p 'require("./node_modules/rollup/package.json").version') \
  && ROLLUP_PKG=$(node -e 'const { platform, arch, report } = process; const isMusl = platform === "linux" && !report.getReport().header.glibcVersionRuntime; const targets = { x64: { gnu: "linux-x64-gnu", musl: "linux-x64-musl" }, arm64: { gnu: "linux-arm64-gnu", musl: "linux-arm64-musl" } }; const target = targets[arch]; if (platform !== "linux" || !target) { console.error(`Unsupported platform/arch for Rollup native package: ${platform}/${arch}`); process.exit(1); } console.log(`@rollup/rollup-${isMusl ? target.musl : target.gnu}`);') \
  && LIGHTNINGCSS_VERSION=$(node -p 'require("./node_modules/lightningcss/package.json").version') \
  && LIGHTNINGCSS_PKG=$(node -e 'const { platform, arch, report } = process; const isMusl = platform === "linux" && !report.getReport().header.glibcVersionRuntime; const targets = { x64: { gnu: "linux-x64-gnu", musl: "linux-x64-musl" }, arm64: { gnu: "linux-arm64-gnu", musl: "linux-arm64-musl" }, arm: { gnu: "linux-arm-gnueabihf" } }; const target = targets[arch]; if (platform !== "linux" || !target || (isMusl && !target.musl)) { console.error(`Unsupported platform/arch for lightningcss native package: ${platform}/${arch}`); process.exit(1); } console.log(`lightningcss-${isMusl ? target.musl : target.gnu}`);') \
  && OXIDE_VERSION=$(node -p 'require("./node_modules/@tailwindcss/oxide/package.json").version') \
  && OXIDE_PKG=$(node -e 'const { platform, arch, report } = process; const isMusl = platform === "linux" && !report.getReport().header.glibcVersionRuntime; const targets = { x64: { gnu: "linux-x64-gnu", musl: "linux-x64-musl" }, arm64: { gnu: "linux-arm64-gnu", musl: "linux-arm64-musl" }, arm: { gnu: "linux-arm-gnueabihf", musl: "linux-arm-musleabihf" } }; const target = targets[arch]; if (platform !== "linux" || !target || (isMusl && !target.musl)) { console.error(`Unsupported platform/arch for @tailwindcss/oxide native package: ${platform}/${arch}`); process.exit(1); } console.log(`@tailwindcss/oxide-${isMusl ? target.musl : target.gnu}`);') \
  && npm install --no-save "${ROLLUP_PKG}@${ROLLUP_VERSION}" "${LIGHTNINGCSS_PKG}@${LIGHTNINGCSS_VERSION}" "${OXIDE_PKG}@${OXIDE_VERSION}"

COPY . .

# Prisma client (Prisma 7 config)
RUN cd /app/apps/api && npx prisma generate --config=prisma.config.ts

# Build backend + frontend
RUN npm --workspace apps/api run build
ENV VITE_API_URL=/api
RUN npm --workspace apps/docksentinel-web run build

FROM node:20-alpine AS prod-deps
WORKDIR /app

# Native deps for better-sqlite3 / argon2 builds (only in this stage)
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  libc6-compat

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install only production deps needed by the API workspace
RUN npm ci --omit=dev --workspace apps/api \
  && PRISMA_VERSION=$(node -p 'require("./apps/api/package.json").devDependencies.prisma') \
  && npm install --no-save --omit=dev --workspace apps/api "prisma@${PRISMA_VERSION}" \
  && npm cache clean --force

FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache \
  nginx \
  ca-certificates \
  openssl \
  libstdc++ \
  tzdata \
  && rm -f /etc/nginx/http.d/default.conf

ENV NODE_ENV=production \
  PORT=3000 \
  LOG_LEVEL=info \
  DATABASE_URL=file:/data/docksentinel.db \
  SCHEDULER_INTERVAL_MIN=5 \
  DOCKSENTINEL_SECRET=CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN \
  AUTO_MIGRATE=true \
  SWAGGER_ENABLED=true \
  CORS_ORIGINS=* \
  TZ=UTC

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=build /app/package.json /app/package-lock.json /app/
COPY --from=build /app/apps/api/package.json /app/apps/api/package.json
COPY --from=build /app/apps/api/prisma.config.ts /app/apps/api/prisma.config.ts
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/api/prisma/schema.prisma /app/apps/api/prisma/schema.prisma
COPY --from=build /app/apps/api/prisma/migrations /app/apps/api/prisma/migrations
COPY --from=build /app/apps/docksentinel-web/dist /app/apps/docksentinel-web/dist

COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /data

EXPOSE 80
VOLUME ["/data"]

ENTRYPOINT ["/entrypoint.sh"]
