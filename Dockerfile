FROM ubuntu:rolling

FROM node:14

RUN mkdir /1chat
# Create app directory
WORKDIR /1chat

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN apt-get update && apt-get install -y ffmpeg wget

# Bundle app source
COPY ./src ./src
COPY ./lib ./lib
COPY ./local ./local
COPY ./config ./config
COPY ./custom-config ./custom-config
COPY ./tsconfig.json ./tsconfig.json

RUN npm install && npm run tsc

EXPOSE 9091
CMD [ "npm", "run", "start" ]
