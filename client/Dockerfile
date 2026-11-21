FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci --workspace client
COPY client ./client
EXPOSE 5173
CMD ["npm", "--workspace", "client", "run", "dev"]
