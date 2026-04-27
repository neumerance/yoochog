# Server deployment (dedicated host, no Docker)

This runbook describes how to run the **static Vue app** (`app/dist/`), the **Socket.io realtime** process (`realtime-server/`), and **nginx** with **TLS** on a machine you control (VM or bare metal). It matches [issue #93](https://github.com/neumerance/yoochog/issues/93): **no Docker in production**, **no GitHub Action** as the production deploy button, and **existing** Let’s Encrypt (or other) certificate **files on disk**—this document wires services; it does not run `certbot` for you.

**Related:** [GitHub Pages](github-pages.md) is a **separate** static surface; CI can keep publishing there. This document is for operators who also (or instead) serve the app from their own host.

## Node.js

Align with `engines` in `app/package.json` and `realtime-server/package.json`: **`^20.19.0 || >=22.12.0`**. Install Node on the host however your team prefers (distribution packages, **nvm**, **fnm**, etc.). The example **systemd** unit calls `node` from `PATH`; if you use nvm for a dedicated user, use the **absolute** path to `node` in `ExecStart=`.

## Environment (build vs runtime)

| Concern | Variable / file | Notes |
|--------|-----------------|--------|
| Socket.io client target | `VITE_SOCKET_URL` | **Build-time** (Vite). Public URL the browser must use, e.g. `https://yoochog.example.com` if nginx terminates TLS on the same host and Socket.io is proxied on that origin (path `/socket.io/` by default). |
| Vite public path / router | `VITE_BASE_PATH` | **Build-time.** Default in repo is `/yoochog/` (GitHub Pages). For the app at the **site root**, set `VITE_BASE_PATH=/` before `npm run build`. Must match **nginx** `location` and static `root` / `alias`. |
| CORS for Socket.io | `SOCKET_CORS_ORIGIN` | **Runtime** on the realtime server. Set to the **browser origin** of the app (e.g. `https://yoochog.example.com`). |
| Realtime listen port | `PORT` | **Runtime** (default **3000**). Bind to loopback; expose only through nginx. |

`deploy.sh` (below) looks for **`$DEPLOY_PATH/shared/build.env`** on the server and **sources** it before `npm run build` in `app/`. Put **`VITE_*`** and any other build-time exports there. **Do not commit** secrets; treat `VITE_*` as public (they ship in the bundle).

## Layout on the server (`deploy.sh`)

[Root `deploy.sh`](../deploy.sh) uses a **Capistrano-style** layout under **`DEPLOY_PATH`** (e.g. `/var/www/yoochog`):

- **`releases/<timestamp>`** — fresh `git clone` of the ref you deploy, then `npm ci` + `npm run build` in `app/`, `npm ci` in `realtime-server/`.
- **`current`** — symlink to the active release.
- **`shared/build.env`** — optional; sourced before the app build (create once on the host).

**Rollback:** `ln -sfn "$DEPLOY_PATH/releases/<older-timestamp>" "$DEPLOY_PATH/current"`, then restart the realtime service (`systemctl restart …`). Nginx `root` should point at `current/…` so a rollback switches both the static app and the tree used for the systemd `WorkingDirectory` (see [systemd example](#process-manager-systemd) below).

The script prunes old release directories, keeping the last **`DEPLOY_RETAIN`** (default `5`).

## First-time operator setup

1. **Provision** the host, DNS, and TLS certificates (this repo does not add `certbot` steps; use what you already have on disk, typically under `/etc/letsencrypt/live/<name>/`).

2. **Create a deployment user** (optional) and **`DEPLOY_PATH`**, e.g. `/var/www/yoochog`, owned by that user. Ensure the user can `git clone` your repository from the network (deploy key or readable remote).

3. **Create** `$DEPLOY_PATH/shared/build.env` on the server, for example:

   ```sh
   export VITE_SOCKET_URL=https://yoochog.example.com
   export VITE_BASE_PATH=/
   ```

4. **Install** the example [nginx vhost](#nginx) and [systemd unit](#process-manager-systemd). Adjust **paths, `server_name`, and certificate files** to match the server.

5. **From your laptop** (with SSH access), from a clone of this repo, configure environment variables and run:

   ```sh
   export DEPLOY_HOST=yoochog.example.com
   export DEPLOY_USER=deploy
   export DEPLOY_PATH=/var/www/yoochog
   export DEPLOY_GIT_URL=git@github.com:neumerance/yoochog.git
   export DEPLOY_REF=master
   ./deploy.sh
   ```

   See the header in [`deploy.sh`](../deploy.sh) for optional variables (`DEPLOY_SSH_IDENTITY`, `DEPLOY_RETAIN`, `DEPLOY_SYSTEMD_SERVICE`, `DEPLOY_SKIP_SYSTEMD`).

6. **Verify:** HTTPS loads the app; host/guest party flows work (if **WebSocket** or long-polling fails, see [Troubleshooting](#troubleshooting)).

## Nginx

Example file ( **copy and edit** on the server — not loaded automatically from the repo):

- [`deploy/nginx/yoochog.example.conf`](../deploy/nginx/yoochog.example.conf)

### Install (Debian/Ubuntu style)

- Copy the edited file to **`/etc/nginx/sites-available/yoochog`**, then:

  ```sh
  sudo ln -s /etc/nginx/sites-available/yoochog /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
  ```

  Other distributions may use **`conf.d/`** instead; same idea.

### `VITE_BASE_PATH` and locations

- If **`VITE_BASE_PATH=/`**, the example serves `app/dist` at **`/`** and proxies **`/socket.io/`** to the Node process.
- If you intentionally mirror the **GitHub Pages** shape (`/yoochog/`), you must set **`VITE_BASE_PATH=/yoochog/`** at build time **and** add matching **`location /yoochog/`** blocks (and SPA fallback) in nginx; the example file includes a short commented stub for that.

### Headers and WebSocket

The example sets **`Host`**, **`X-Real-IP`**, **`X-Forwarded-For`**, **`X-Forwarded-Proto`**, and **HTTP/1.1** upgrade headers for **Socket.io** (including long-polling and **WebSocket**). Tune **`proxy_read_timeout`** if you see disconnects under load.

## Process manager: systemd

Example unit (adjust **User**, **paths**, and **Environment**):

- [`deploy/systemd/yoochog-realtime.service`](../deploy/systemd/yoochog-realtime.service)

Install under **`/etc/systemd/system/`**, then:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now yoochog-realtime
```

`WorkingDirectory` should resolve to `$DEPLOY_PATH/current/realtime-server` (the deploy script’s **`current`** symlink). Set **`Environment=SOCKET_CORS_ORIGIN=...`** to your **https** app origin.

### PM2 (alternative)

If you use **pm2** instead of systemd: `cd $DEPLOY_PATH/current/realtime-server`, `pm2 start server.mjs --name yoochog-realtime`, and persist with `pm2 save` / `pm2 startup` per pm2’s docs. Keep the same **PORT** and **SOCKET_CORS_ORIGIN** as in the systemd example.

## Troubleshooting

| Symptom | Things to check |
|--------|-------------------|
| **502** from nginx to Node | Realtime process running? `PORT` matches `proxy_pass`? `systemctl status` or `curl -v http://127.0.0.1:3000/socket.io/?EIO=4&transport=polling` |
| **CORS** errors in the browser | **`SOCKET_CORS_ORIGIN`** on the server matches the app’s `https://` origin (scheme + host, no path). |
| **WebSocket** fails or **400** on `/socket.io/` | nginx **`Upgrade`** / **`Connection`** headers, **`proxy_http_version 1.1`**, and that **only one** of HTTP upgrade or long-poll is misconfigured. Compare with [`yoochog.example.conf`](../deploy/nginx/yoochog.example.conf). |
| **Wrong asset or join URL** | **`VITE_BASE_PATH`** in the last build, **`import.meta.env.BASE_URL`**, and nginx **`root`/`location`** must agree. Rebuild the app after changing `VITE_BASE_PATH`. |
| **Party works on Pages but not on custom host** | Rebuild with **`VITE_SOCKET_URL`** pointing at the public Socket.io origin behind nginx, not a stale or internal-only URL. |

## References

- [ADR 0006 — Socket.io](adr/0006-socketio-realtime.md)
- [README — dedicated server (short)](../README.md#dedicated-server-no-docker-no-deploy-action)
