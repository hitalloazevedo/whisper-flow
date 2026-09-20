FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN pnpm install --frozen-lockfile --filter @whisper-flow/frontend...

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/frontend ./apps/frontend
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @whisper-flow/frontend run build

FROM nginx:1.27-alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
