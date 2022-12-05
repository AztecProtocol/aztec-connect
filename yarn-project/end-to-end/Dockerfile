FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY blockchain blockchain
COPY sdk sdk
# Remove need to compile contracts once they're fully in foundry and abis are added to yarn-project-base.
RUN cd barretenberg.js && yarn build && cd ../sdk && yarn build

COPY end-to-end end-to-end
WORKDIR /usr/src/yarn-project/end-to-end
RUN yarn formatting
# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production

FROM node:18-alpine
ENV CHROME_BIN="/usr/bin/chromium-browser" PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
RUN apk update && apk add --no-cache udev ttf-freefont chromium
COPY --from=0 /usr/src /usr/src
WORKDIR /usr/src/yarn-project/end-to-end
ENV DEBUG=bb:*
# In node 16+ we get a weird error if we don't define the following. Remove once fixed.
ENV NODE_OPTIONS=--openssl-legacy-provider
CMD ["yarn", "test"]