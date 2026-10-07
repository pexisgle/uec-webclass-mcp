FROM node:26-bookworm-slim

WORKDIR /app
ENV CI=true

RUN npm install --global --ignore-scripts=false @endevco/aube@2.6.1
COPY package.json aube-lock.yaml ./
RUN aube ci \
    && apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

USER node
RUN node_modules/.bin/lightpanda install
COPY src ./src
EXPOSE 3000
CMD ["node", "src/index.ts"]
