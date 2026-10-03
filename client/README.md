# Frontend development

## Docker

For frontend-only development, run from `client/`:

```sh
docker compose up --build   # First build and start
docker compose up           # Later starts
docker compose down         # Stop
```

Frontend: http://localhost:5173

Vite runs on `0.0.0.0:5173`. Source bind mounts provide HMR without restarting Compose, and a separate volume keeps container dependencies out of the host `node_modules`.

The `/api` proxy needs a running backend. Compose sets `VITE_API_PROXY_TARGET` to `http://host.docker.internal:5005` for Docker Desktop. Set `DOCKER_API_PROXY_TARGET` in your shell to use another reachable backend; this avoids inheriting a host-only proxy address from the existing Vite `.env`.

Use [root Compose](../README.md#local-development-with-docker) to run both services, or for dependency rebuild and environment-change instructions. Frontend production deployment remains Netlify.
