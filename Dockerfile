# ---- build: static PWA bundle ----
# Static output is platform independent, so always build natively
FROM --platform=$BUILDPLATFORM node:26-alpine AS build
RUN npm install -g pnpm@11.9.0
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
	pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ---- runtime: nginx serving the bundle ----
FROM nginx:alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-pill-config.sh /docker-entrypoint.d/40-pill-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
