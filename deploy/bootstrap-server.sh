#!/usr/bin/env bash
# Run on the production host as root (e.g. cat deploy/bootstrap-server.sh | ssh root@yoochoog.app bash)
# or:  ssh root@yoochoog.app 'bash -s' < deploy/bootstrap-server.sh
#
# Installs: git, Node.js 22 (NodeSource, matches app/engines), nginx; creates /var/www/yoochog.
# OS: Debian/Ubuntu (apt). Exits 1 on other distros unless you adapt.
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (e.g. sudo -i on the server)" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script expects apt (Debian/Ubuntu). Install git, node ^20.19, and nginx manually, then re-run deploy." >&2
  exit 1
fi

apt-get update -y
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  gnupg

# Node 22 (satisfies ^20.19.0 || >=22.12.0 in app/ and realtime-server)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

apt-get install -y --no-install-recommends nginx

mkdir -p /var/www/yoochog/releases /var/www/yoochog/shared

node -v
npm -v
git --version
nginx -v

echo "==> OK: node, npm, git, and nginx are installed. /var/www/yoochog is ready."
echo "    Next: install nginx site + systemd (see deploy/nginx, deploy/systemd) and run ./deploy.sh from your laptop."
