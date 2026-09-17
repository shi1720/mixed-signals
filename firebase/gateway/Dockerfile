FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json server.mjs ./
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
