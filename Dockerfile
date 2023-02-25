FROM ubuntu:rolling
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC

RUN apt-get update

RUN apt-get install -y build-essential software-properties-common curl

RUN apt-get install -y python3 python3-dev python3-pip

# get install script and pass it to execute: 
RUN curl -sL https://deb.nodesource.com/setup_lts.x | bash
# and install node 
RUN apt-get install nodejs

RUN apt-get install -y ffmpeg wget vim

RUN apt-get install -y pkg-config libpixman-1-dev libcairo2-dev libpango1.0-dev libjpeg8-dev libgif-dev

COPY ./src/animalicons/fonts/ /usr/share/fonts/truetype/
RUN fc-cache -fv

RUN npm i -g yarn

RUN mkdir /home/app && mkdir /home/app/1chat
COPY package.json /home/app/1chat/
COPY yarn.lock /home/app/1chat/
COPY ./tsconfig.json /home/app/1chat/tsconfig.json
WORKDIR /home/app/1chat
RUN mkdir /home/app/1chat/dist
RUN yarn

CMD yarn run tsc && yarn start