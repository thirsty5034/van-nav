# ============================================================
# Stage 1: Frontend Build
# ============================================================
FROM node:22-alpine AS frontend
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /build
COPY ui/package.json ui/pnpm-lock.yaml ui/pnpm-workspace.yaml ./ui/
RUN cd ui && pnpm install --frozen-lockfile --ignore-scripts --config.confirmModulesPurge=false
COPY ui/ ./ui/
RUN cd ui && CI=false pnpm build

# ============================================================
# Stage 2: Backend Build
# ============================================================
FROM golang:1.26-alpine AS backend
RUN apk --no-cache add git
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /build/ui/build /build/public
ARG VERSION=docker
RUN GONOSUMCHECK=* GOFLAGS=-mod=mod go build -ldflags="-s -w -X main.Version=${VERSION}" -o van-nav .

# ============================================================
# Stage 3: Final Runtime Image
# ============================================================
FROM alpine:latest
ENV TZ=Asia/Shanghai
RUN apk --no-cache add ca-certificates tzdata curl && \
    cp "/usr/share/zoneinfo/$TZ" /etc/localtime && \
    echo "$TZ" > /etc/timezone
WORKDIR /app
COPY --from=backend /build/van-nav /app/van-nav
COPY seed-data.json /app/seed-data.json
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

VOLUME ["/app/data"]
EXPOSE 6412
ENTRYPOINT ["/app/docker-entrypoint.sh"]
