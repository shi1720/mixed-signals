# Reproducible verification environment. This is not the production host.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "check:all"]
