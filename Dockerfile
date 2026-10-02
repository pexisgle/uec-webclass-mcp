FROM node:26-bookworm-slim

WORKDIR /app
ENV CI=true \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN npm install --global --ignore-scripts=false @endevco/aube@2.5.0
COPY package.json aube-lock.yaml ./
RUN aube ci \
    && node_modules/.bin/playwright-core install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

COPY src ./src
USER node
EXPOSE 3000
CMD ["node", "src/index.ts"]
