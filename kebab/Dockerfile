FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain

FROM node:16-alpine3.15 AS builder
COPY --from=0 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
COPY --from=1 /usr/src/blockchain/dest /usr/src/blockchain/dest
WORKDIR /usr/src/kebab
COPY . .
RUN yarn install --frozen-lockfile && \
  yarn build && \
  rm -rf node_modules && \
  yarn install --frozen-lockfile --production && \
  yarn cache clean

FROM node:16-alpine3.15
RUN apk update && apk add --no-cache bash
COPY --from=builder /usr/src /usr/src
WORKDIR /usr/src/kebab
CMD ["yarn", "start"]
EXPOSE 8545
