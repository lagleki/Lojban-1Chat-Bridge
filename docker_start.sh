podman run -d \
  --restart unless-stopped \
  -it \
  --env DOCKER_CACHE_FOLDER_PATH=/1chat_config \
  --name 1chat \
  --mount type=bind,source="$(pwd)"/custom-config,target=/1chat_config \
  1chat