FROM ubuntu:rolling

RUN apt-get update

RUN apt-get install -y build-essential software-properties-common curl

RUN apt-get install -y python3 python3-dev python3-pip nodejs npm

RUN apt-get install -y ffmpeg wget

COPY ./src/animalicons/fonts/ /usr/share/fonts/truetype/
RUN fc-cache -fv

RUN useradd -ms /bin/bash app
USER app
COPY --chown=app:app package*.json /home/app/1chat/
COPY --chown=app:app ./tsconfig.json /home/app/1chat/tsconfig.json
WORKDIR /home/app/1chat
RUN mkdir /home/app/1chat/dist
RUN npm i

CMD npm run tsc ; npm run start
