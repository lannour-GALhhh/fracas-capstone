# ---- build stage: produce the static production bundle -------------------
FROM node:20-alpine AS build
WORKDIR /frontend
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite inlines VITE_* at build time, so they must be passed as build args.
ARG VITE_API_URL
ARG VITE_APP_DOWNLOAD_URL
ENV VITE_API_URL=$VITE_API_URL VITE_APP_DOWNLOAD_URL=$VITE_APP_DOWNLOAD_URL
RUN npm run build

# ---- dev stage (default): Vite dev server with HMR -----------------------
# `docker compose up` targets this so local frontend edits stay live. A named
# volume shadows /frontend/node_modules at runtime, so reconcile it against the
# lockfile (installs only the delta, no-op when in sync) before starting Vite.
FROM node:20-alpine AS dev
WORKDIR /frontend
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["sh", "-c", "npm install && npm run dev -- --host"]

# ---- production stage: serve the built bundle as static files ------------
# Listens on 5173 (same port as the dev server) so the fronting nginx proxies
# `/` to frontend:5173 unchanged in both modes.
FROM nginx:1.25-alpine AS production
COPY --from=build /frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5173
