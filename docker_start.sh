#!/bin/bash

docker kill 1chat 2> /dev/null
docker rm 1chat 2> /dev/null

docker run \
  -it \
  --name 1chat \
  --memory 1g \
  --cpus 1 \
  -p 9091:3000 \
  --log-opt max-size=20k --log-opt max-file=1 \
  -v $(pwd)/src:/app/src/:Z \
  -v $(pwd)/data:/app/data/:Z \
  -v $(pwd)/default-config:/app/default-config/:Z \
  1chat
