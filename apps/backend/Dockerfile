FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json
RUN pnpm install --frozen-lockfile --filter @whisper-flow/backend...

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/backend ./apps/backend
RUN pnpm --filter @whisper-flow/backend run build
RUN pnpm --filter @whisper-flow/backend deploy --prod /deploy

FROM base AS runtime
COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /deploy/package.json ./package.json

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
    CMD node -e "require('http').get({host:'localhost',port:process.env.PORT||3000,path:'/api/v1/health'},res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
