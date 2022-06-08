FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg-wasm-linux-clang
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg-x86_64-linux-clang

FROM node:16-alpine3.15 AS builder
WORKDIR /usr/src/barretenberg.js
COPY . .
COPY --from=0 /usr/src/barretenberg/build/bin/barretenberg.wasm ./src/wasm/barretenberg.wasm
COPY --from=1 /usr/src/barretenberg/build/bin/db_cli ../barretenberg/build/bin/db_cli
RUN yarn cache clean && yarn install --frozen-lockfile && yarn test && yarn build && rm -rf node_modules && yarn cache clean

FROM alpine:latest
COPY --from=builder /usr/src/barretenberg.js /usr/src/barretenberg.js