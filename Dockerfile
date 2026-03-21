# Single-stage: Node 22 + ffmpeg (audio conversion in download-file). sharp ships prebuilt binaries.
FROM node:22-bookworm-slim

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  ffmpeg \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /home/app/1chat

COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN mkdir -p dist data && pnpm install --frozen-lockfile

COPY src ./src
COPY default-config ./default-config

RUN pnpm run tsc

CMD ["pnpm", "start"]
