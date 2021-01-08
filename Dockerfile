FROM ubuntu:rolling

RUN apt-get update

RUN apt-get install -y build-essential software-properties-common curl

RUN apt-get install -y python3 python3-dev python3-pip nodejs npm

RUN apt-get install -y ffmpeg wget

COPY ./src/animalicons/fonts/ /usr/share/fonts/truetype/
RUN fc-cache -fv

RUN mkdir /home/app && mkdir /home/app/1chat
COPY package*.json /home/app/1chat/
COPY ./tsconfig.json /home/app/1chat/tsconfig.json
WORKDIR /home/app/1chat
RUN mkdir /home/app/1chat/dist
RUN npm i && npm i -g npm-check-updates

CMD npm run tsc && npm run start
