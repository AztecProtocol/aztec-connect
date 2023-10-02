FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY blockchain blockchain
COPY sdk sdk
RUN cd barretenberg.js && yarn build && cd ../sdk && yarn build

COPY end-to-end end-to-end
WORKDIR /usr/src/yarn-project/end-to-end
RUN yarn formatting
# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production > /dev/null

FROM node:18-alpine
ENV CHROME_BIN="/usr/bin/chromium-browser" PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
RUN apk update && apk add --no-cache \
  bash \
  curl \
  udev \
  jq \
  chromium \
  chromium-chromedriver \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont

COPY --from=0 /usr/src /usr/src
WORKDIR /usr/src/yarn-project/end-to-end
ENV DEBUG=bb:*
ENTRYPOINT ["yarn", "test"]