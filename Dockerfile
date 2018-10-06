FROM node:argon

USER root
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y libicu-dev

RUN npm install -g MessengerBridge

RUN useradd -ms /bin/bash MessengerBridge
USER MessengerBridge

RUN mkdir -p /home/MessengerBridge/.MessengerBridge
VOLUME ["/home/MessengerBridge/.MessengerBridge"]

EXPOSE 9090

CMD ["MessengerBridge"]
