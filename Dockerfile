FROM ubuntu:rolling
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC

RUN apt-get update

RUN apt-get install -y build-essential software-properties-common curl

RUN apt-get install -y python3 python3-dev python3-pip

# get install script and pass it to execute: 
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash
# and install node 
RUN apt-get install nodejs

RUN apt-get install -y ffmpeg wget vim

RUN  apt-get install -y gnupg ca-certificates \
     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
     && apt-get update \
     # We install Chrome to get all the OS level dependencies, but Chrome itself
     # is not actually used as it's packaged in the node puppeteer library.
     # Alternatively, we could could include the entire dep list ourselves
     # (https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix)
     # but that seems too easy to get out of date.
     && apt-get install -y google-chrome-stable \
     && rm -rf /var/lib/apt/lists/* \
     && wget --quiet https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -O /usr/sbin/wait-for-it.sh \
     && chmod +x /usr/sbin/wait-for-it.sh

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

COPY ./src/animalicons/fonts/ /usr/share/fonts/truetype/
RUN fc-cache -fv

RUN mkdir /home/app && mkdir /home/app/1chat
COPY package*.json /home/app/1chat/
COPY ./tsconfig.json /home/app/1chat/tsconfig.json
WORKDIR /home/app/1chat
RUN mkdir /home/app/1chat/dist
RUN npm i && npm i -g npm-check-updates

CMD npm run tsc && npm run start
