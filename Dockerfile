
FROM alpine

ENV PYTHONUNBUFFERED=1
RUN apk add python3 && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --upgrade pip setuptools

RUN apk add \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn \
      vim curl bash

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

RUN apk add ghostscript ffmpeg

# Run everything after as non-privileged user.

# USER pptruser

RUN mkdir -p /app/src

WORKDIR /app/

RUN yarn global add npm-check-updates pm2

COPY package.json /app/
COPY ./tsconfig.json /app/tsconfig.json

RUN apk add build-base g++ cairo-dev jpeg-dev pango-dev imagemagick
# RUN apk add make gcc g++ python pkgconfig pixman-dev cairo-dev pango-dev libjpeg-turbo-dev giflib-dev
WORKDIR /app/

# RUN chown -R 1000:1000 /root

RUN yarn config set registry https://registry.npmjs.org/

RUN yarn global add node-gyp ts-node

RUN yarn

COPY ./src/animalicons/fonts/ /usr/share/fonts/truetype/
RUN fc-cache -fv

CMD yarn tsc && yarn start


# RUN mkdir /home/app && mkdir /home/app/1chat
# COPY package*.json /home/app/1chat/
# COPY ./tsconfig.json /home/app/1chat/tsconfig.json
# WORKDIR /home/app/1chat
# RUN mkdir /home/app/1chat/dist

