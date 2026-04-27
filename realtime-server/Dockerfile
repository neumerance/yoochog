# Image for Compose / local convenience only—not the supported production path on a dedicated host.
# See ../docs/server-deployment.md for nginx + systemd + host Node.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs ./
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.mjs"]
