#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# yoochog: deploy to a dedicated host over SSH (Capistrano-style: releases/ + current).
# Run this from a developer/operator machine with network access to both git and the server.
# Rollback: repoint the `current` symlink to an older release under DEPLOY_PATH/releases, then
#   restart the realtime service (see docs/server-deployment.md).
#
# Required environment:
#   DEPLOY_HOST     Target hostname or IP.
#   DEPLOY_GIT_URL  Remote git URL the server can clone (HTTPS or SSH form).
#   DEPLOY_PATH     Absolute base path on the server, e.g. /var/www/yoochog
#
# Optional:
#   DEPLOY_USER            SSH user (default: current user on this machine).
#   DEPLOY_REF             Git branch or tag (default: master).
#   DEPLOY_SSH_IDENTITY    Path to an SSH private key (passed to ssh -i).
#   DEPLOY_SSH_PORT        SSH port (default: 22).
#   DEPLOY_RETAIN          How many old release directories to keep (default: 5).
#   DEPLOY_SYSTEMD_SERVICE systemctl unit to restart (default: yoochog-realtime).
#   DEPLOY_SKIP_SYSTEMD    If set to 1, skip systemctl after deploy.
#
# The server can optionally define DEPLOY_PATH/shared/build.env (VITE_SOCKET_URL, VITE_BASE_PATH, …);
# that file is sourced (set -a) before `npm run build` in app/.
#
# Node on the host must satisfy app/realtime-server engines (^20.19.0 || >=22.12.0).
# ------------------------------------------------------------------------------
set -euo pipefail

: "${DEPLOY_HOST:?set DEPLOY_HOST (target host)}"
: "${DEPLOY_GIT_URL:?set DEPLOY_GIT_URL (git clone URL)}"
: "${DEPLOY_PATH:?set DEPLOY_PATH (absolute path on server, e.g. /var/www/yoochog)}"

DEPLOY_USER="${DEPLOY_USER:-$USER}"
DEPLOY_REF="${DEPLOY_REF:-master}"
DEPLOY_SSH_PORT="${DEPLOY_SSH_PORT:-22}"
DEPLOY_RETAIN="${DEPLOY_RETAIN:-5}"
DEPLOY_SYSTEMD_SERVICE="${DEPLOY_SYSTEMD_SERVICE:-yoochog-realtime}"
DEPLOY_ID="$(date -u +%Y%m%d-%H%M%S)"

SSH_CMD=(ssh -p "$DEPLOY_SSH_PORT" -o StrictHostKeyChecking=accept-new)
if [[ -n "${DEPLOY_SSH_IDENTITY:-}" ]]; then
  SSH_CMD+=(-i "$DEPLOY_SSH_IDENTITY")
fi
SSH_CMD+=("${DEPLOY_USER}@${DEPLOY_HOST}")

echo "==> yoochog deploy: ${DEPLOY_USER}@${DEPLOY_HOST} ${DEPLOY_PATH} release=${DEPLOY_ID} ref=${DEPLOY_REF}"

# Remote script: arguments (quoted by ssh) pass paths/URLs with spaces safely.
# shellcheck disable=SC2029
"${SSH_CMD[@]}" bash -s -- \
  "$DEPLOY_GIT_URL" \
  "$DEPLOY_ID" \
  "$DEPLOY_PATH" \
  "$DEPLOY_REF" \
  "$DEPLOY_RETAIN" \
  "$DEPLOY_SYSTEMD_SERVICE" \
  "${DEPLOY_SKIP_SYSTEMD:-0}" <<'END_REMOTE'
set -euo pipefail
DEPLOY_GIT_URL=$1
DEPLOY_ID=$2
DEPLOY_PATH=$3
DEPLOY_REF=$4
DEPLOY_RETAIN=$5
DEPLOY_SYSTEMD_SERVICE=$6
DEPLOY_SKIP_SYSTEMD=$7

RELEASE_DIR="${DEPLOY_PATH}/releases/${DEPLOY_ID}"
mkdir -p "${DEPLOY_PATH}/releases" "${DEPLOY_PATH}/shared"

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is required on the server." >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required on the server (see docs/server-deployment.md)." >&2
  exit 1
fi

rm -rf "${RELEASE_DIR}"
git clone --depth 1 --branch "${DEPLOY_REF}" "${DEPLOY_GIT_URL}" "${RELEASE_DIR}"
cd "${RELEASE_DIR}/app"
if [[ -f "${DEPLOY_PATH}/shared/build.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "${DEPLOY_PATH}/shared/build.env"
  set +a
fi
echo "==> npm ci (app)…"
npm ci
echo "==> npm run build (app)…"
npm run build
cd "${RELEASE_DIR}/realtime-server"
echo "==> npm ci (realtime-server)…"
npm ci

cd "${DEPLOY_PATH}"
ln -sfn "releases/${DEPLOY_ID}" current

i=1
# shellcheck disable=SC2012
for d in $(ls -1t "${DEPLOY_PATH}/releases"); do
  if [[ "${i}" -gt "${DEPLOY_RETAIN}" ]]; then
    echo "==> removing old release: ${d}"
    rm -rf "${DEPLOY_PATH}/releases/${d}" || true
  fi
  i=$((i + 1))
done

if [[ "${DEPLOY_SKIP_SYSTEMD}" == "1" ]]; then
  echo "==> skipped systemctl (DEPLOY_SKIP_SYSTEMD=1); restart when ready"
  exit 0
fi
if command -v systemctl >/dev/null 2>&1 && systemctl is-system-running >/dev/null 2>&1; then
  if sudo -n true 2>/dev/null; then
    echo "==> sudo systemctl restart ${DEPLOY_SYSTEMD_SERVICE}"
    sudo -n systemctl restart "${DEPLOY_SYSTEMD_SERVICE}" || {
      echo "systemctl restart failed" >&2
      exit 1
    }
  else
    echo "==> run on server: sudo systemctl restart ${DEPLOY_SYSTEMD_SERVICE}"
  fi
else
  echo "==> systemctl not available; start realtime manually (see deploy/systemd/)"
fi
END_REMOTE

echo "==> done"
