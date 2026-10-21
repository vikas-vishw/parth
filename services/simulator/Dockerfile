# Parth simulator image. Build context is the repo root:
#   docker build -f services/simulator/Dockerfile .
# No secrets or Panel_Keys are baked in; configuration arrives at runtime via env_file.

# Production-only dependencies (the @parth/shared workspace link only at P0), hoisted
# into /repo/node_modules by node-linker=hoisted (.npmrc).
FROM node:24.21.0-bookworm-slim AS deps
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/app/package.json apps/app/
COPY apps/admin/package.json apps/admin/
COPY services/gateway/package.json services/gateway/
COPY services/simulator/package.json services/simulator/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod --filter @parth/simulator...

# Full install and build of shared and the simulator (unchanged from Phase 0).
FROM node:24.21.0-bookworm-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/app/package.json apps/app/
COPY apps/admin/package.json apps/admin/
COPY services/gateway/package.json services/gateway/
COPY services/simulator/package.json services/simulator/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @parth/simulator...
COPY packages/shared packages/shared
COPY services/simulator services/simulator
RUN pnpm --filter @parth/simulator... build

# Runtime: the workspace layout is kept so @parth/shared resolves, the panel loads
# from services/simulator/panel, and the CLI runs with
# `docker compose exec simulator node dist/cli.js ...`.
FROM node:24.21.0-bookworm-slim
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
# pnpm's hoisted linker keeps workspace links and version-split packages in the package's own
# node_modules, not the root one (design K12).
COPY --from=deps /repo/services/simulator/node_modules services/simulator/node_modules
COPY --from=deps /repo/packages/shared/node_modules packages/shared/node_modules
COPY --from=build /repo/packages/shared/package.json packages/shared/
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/services/simulator/package.json services/simulator/
COPY --from=build /repo/services/simulator/dist services/simulator/dist
COPY --from=build /repo/services/simulator/panel services/simulator/panel
WORKDIR /repo/services/simulator
RUN node --input-type=module -e "await import('@parth/shared');"
USER node
CMD ["node", "dist/index.js"]
