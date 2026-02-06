FROM node:20-bullseye AS build
WORKDIR /app

# Native deps for better-sqlite3 / argon2 builds
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/docksentinel-web/package.json apps/docksentinel-web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY . .

# Prisma client
RUN cd /app/apps/api && npx prisma generate --config=prisma.config.ts

# Build backend + frontend
RUN npm --workspace apps/api run build
ENV VITE_API_URL=/api
RUN npm --workspace apps/docksentinel-web run build

FROM node:20-bullseye-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  nginx \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default

ENV NODE_ENV=production \
  PORT=3000 \
  LOG_LEVEL=info \
  DATABASE_URL=file:/data/docksentinel.db \
  SCHEDULER_INTERVAL_MIN=5 \
  DOCKSENTINEL_SECRET=CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN \
  AUTO_MIGRATE=true \
  SWAGGER_ENABLED=true \
  CORS_ORIGINS=*

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package-lock.json /app/
COPY --from=build /app/apps/api/package.json /app/apps/api/package.json
COPY --from=build /app/apps/api/prisma.config.ts /app/apps/api/prisma.config.ts
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/api/prisma /app/apps/api/prisma
COPY --from=build /app/apps/docksentinel-web/dist /app/apps/docksentinel-web/dist

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /data

EXPOSE 80
VOLUME ["/data"]

ENTRYPOINT ["/entrypoint.sh"]
