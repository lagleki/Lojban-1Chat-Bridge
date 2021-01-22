#!/bin/bash

docker kill 1chat
docker rm 1chat

docker run \
  -it \
  --name 1chat \
  --memory 1g \
  --cpus 1 \
  -p 9091:3000 \
  -v $(pwd)/src:/home/app/1chat/src/:Z \
  -v $(pwd)/data:/home/app/1chat/data/:Z \
  -v $(pwd)/default-config:/home/app/1chat/default-config/:Z \
  -v $(pwd)/node_modules:/home/app/1chat/node_modules/:Z \
  1chat
