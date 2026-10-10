# ---- build: the app and its server, as a self-contained .output ----
# Pure JavaScript (SQLite is built into Node), so it builds natively and the
# output runs on any platform
FROM --platform=$BUILDPLATFORM node:26-alpine AS build
RUN npm install -g pnpm@11.9.0
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
	pnpm install --frozen-lockfile

COPY . .
# The commit being built, shown in the app's settings
ARG COMMIT_SHA=dev
ENV COMMIT_SHA=$COMMIT_SHA
RUN pnpm test && pnpm run build

# ---- runtime ----
FROM node:26-alpine AS runtime
# Time zone data, so TZ decides what "today" is on the server
RUN apk add --no-cache tzdata

WORKDIR /app
COPY --from=build /app/.output ./.output

# The database lives in a volume at /data. Named volumes take this
# directory's owner, so the non-root "node" user (uid 1000) can write to it;
# a bind mount needs the host directory chowned to 1000:1000.
RUN mkdir -p /data && chown node:node /data
USER node

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATABASE_PATH=/data/pill-tracker.sqlite
ENV TZ=Europe/Copenhagen
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
