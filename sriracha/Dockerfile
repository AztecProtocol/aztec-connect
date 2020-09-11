FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg:x86_64-linux-clang
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain:latest

FROM node:12-alpine AS builder
RUN apk update && apk add --no-cache build-base python llvm9-libs bash git
COPY --from=0 /usr/src/barretenberg/build/src/aztec/rollup/db_cli/db_cli /usr/src/barretenberg/build/src/aztec/rollup/db_cli/db_cli
COPY --from=1 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
COPY --from=2 /usr/src/blockchain/dest /usr/src/blockchain/dest
WORKDIR /usr/src/sriracha
COPY . .
RUN yarn install && yarn test && yarn build && rm -rf node_modules && yarn install --production && yarn cache clean

FROM node:12-alpine
RUN apk update && apk add --no-cache llvm9-libs
COPY --from=builder /usr/src /usr/src
WORKDIR /usr/src/sriracha
CMD ["yarn", "start"]
EXPOSE 8082