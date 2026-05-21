FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @abo-al-abed/api build

FROM node:20-alpine AS runner
RUN corepack enable
WORKDIR /workspace

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /workspace /workspace

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
