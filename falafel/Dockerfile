FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg:x86_64-linux-clang
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest

FROM node:12-alpine AS builder
RUN apk update && apk add --no-cache build-base python llvm9-libs
COPY --from=0 /usr/src/barretenberg/build/src/aztec/rollup/db_cli/db_cli /usr/src/barretenberg/build/src/aztec/rollup/db_cli/db_cli
COPY --from=0 /usr/src/barretenberg/build/src/aztec/rollup/rollup_cli/rollup_cli /usr/src/barretenberg/build/src/aztec/rollup/rollup_cli/rollup_cli
COPY --from=1 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
WORKDIR /usr/src/falafel
COPY . .
RUN yarn install && yarn test && yarn build && rm -rf node_modules && yarn install --production && yarn cache clean

FROM node:12-alpine
RUN apk update && apk add --no-cache llvm9-libs
COPY --from=builder /usr/src /usr/src
WORKDIR /usr/src/falafel
CMD ["yarn", "start"]
EXPOSE 80