# Base image (node:20-alpine)

FROM node:20-alpine as base 
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM base AS test 
RUN npm test


FROM base AS prod
RUN npm prune --omit=dev
EXPOSE 4000
CMD ["node","src/server.js"]

