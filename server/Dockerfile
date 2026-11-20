FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm install --no-package-lock --include=optional --omit=dev
COPY server ./server
EXPOSE 3001
CMD ["node", "server/src/index.js"]
