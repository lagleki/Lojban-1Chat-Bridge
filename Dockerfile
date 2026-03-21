# Single-stage: node:22-bookworm-slim. Avatar rendering uses @napi-rs/canvas (Skia, prebuilt) — no Cairo stack.
# sharp / @tensorflow/tfjs-node still need build tools + libgomp; ffmpeg for audio.

FROM node:22-bookworm-slim

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  python3 \
  pkg-config \
  ffmpeg \
  fontconfig \
  ca-certificates \
  libgomp1 \
  && rm -rf /var/lib/apt/lists/*

COPY ./src/animalicons/fonts/ /usr/share/fonts/truetype/

RUN fc-cache -fv && corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /home/app/1chat

COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN mkdir -p dist data && pnpm install --frozen-lockfile

COPY src ./src
COPY default-config ./default-config

RUN pnpm run tsc && \
  cp -r src/animalicons/fonts dist/animalicons/ && \
  cp -r src/animalicons/svg dist/animalicons/ && \
  cp -r src/animalicons/svg2 dist/animalicons/

CMD ["pnpm", "start"]
