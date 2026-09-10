# Multi-stage build: compile TypeScript, then ship only the production
# node_modules + compiled JS.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# Plain static files (frontend/) — served at runtime via
# @nestjs/serve-static from process.cwd(), not compiled into dist/.
COPY frontend ./frontend
# Runs migrations (and, if DIRECTOR_EMAIL/DIRECTOR_PASSWORD are set, seeds
# the first director account) before starting — needed on platforms with
# no shell/SSH access to run these as separate one-off commands.
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["./start.sh"]
