#!/bin/bash

docker kill 1chat
docker rm 1chat

docker run \
  -it \
  --name 1chat \
  --memory 1g \
  --cpus 1 \
  -p 9091:3000 \
  --log-opt max-size=1m --log-opt max-file=1 \
  -v $(pwd)/dist:/home/app/1chat/dist/:Z \
  -v $(pwd)/src:/home/app/1chat/src/:Z \
  -v $(pwd)/data:/home/app/1chat/data/:Z \
  -v $(pwd)/default-config:/home/app/1chat/default-config/:Z \
  1chat
