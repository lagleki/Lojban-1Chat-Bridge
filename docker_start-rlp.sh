podman kill 1chat
podman rm 1chat

podman run \
  -it \
  --name 1chat \
  -p $1:$1 \
  -v $HOME:src/:rw \
  1chat bash -c "RUN npm install && npm run tsc && npm run start"
