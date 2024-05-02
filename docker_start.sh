#!/bin/bash

docker kill 1chat 2> /dev/null
docker rm 1chat 2> /dev/null

docker run \
  -it \
  --name 1chat \
  --memory 1g \
  --cpus 1 \
  --network=host \
  --log-opt max-size=20k --log-opt max-file=1 \
  -v $(pwd)/src:/home/app/1chat/src/:Z \
  -v $(pwd)/dist:/home/app/1chat/dist/:Z \
  -v $(pwd)/data:/home/app/1chat/data/:Z \
  -v $(pwd)/default-config:/home/app/1chat/default-config/:Z \
  1chat
