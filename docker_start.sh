podman run -d \
  --restart unless-stopped \
  -it \
  --name 1chat \
  -p 9091:3000 \
  -v $(pwd)/src:/home/app/1chat/src/:rw \
  -v $(pwd)/local:/home/app/1chat/local/:rw \
  -v $(pwd)/config:/home/app/1chat/config/:rw \
  -v $(pwd)/custom-config:/home/app/1chat/custom-config/:rw \
  1chat

