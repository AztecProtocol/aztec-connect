FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg-x86_64-linux-clang
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js

FROM node:14-alpine AS builder
RUN apk update && apk add --no-cache build-base python3 llvm10-libs bash git
COPY --from=0 /usr/src/barretenberg/build/src/aztec/rollup/rollup_cli/rollup_cli /usr/src/barretenberg/build/src/aztec/rollup/rollup_cli/rollup_cli
COPY --from=1 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
WORKDIR /usr/src/halloumi
COPY . .
RUN yarn install --frozen-lockfile && \
  yarn test && \
  yarn build && \
  rm -rf node_modules && \
  yarn install --frozen-lockfile --production && \
  yarn cache clean

FROM node:14-alpine
RUN apk update && apk add --no-cache llvm10-libs
COPY --from=builder /usr/src /usr/src
WORKDIR /usr/src/halloumi
CMD ["yarn", "start"]
EXPOSE 80