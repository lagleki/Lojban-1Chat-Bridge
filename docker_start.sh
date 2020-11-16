podman run -d \
  --restart unless-stopped \
  -it \
  --name 1chat \
  -p 9091:9091 \
  1chat