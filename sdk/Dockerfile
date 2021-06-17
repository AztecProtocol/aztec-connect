FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sriracha:latest

FROM node:14.8.0-alpine AS builder
COPY --from=0 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
COPY --from=1 /usr/src/blockchain/dest /usr/src/blockchain/dest
COPY --from=2 /usr/src/sriracha/dest /usr/src/sriracha/dest
WORKDIR /usr/src/sdk
COPY . .
RUN yarn install && yarn test --runInBand && yarn build && rm -rf node_modules && yarn cache clean

FROM node:14.8.0-alpine
COPY --from=0 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
COPY --from=1 /usr/src/blockchain/dest /usr/src/blockchain/dest
COPY --from=2 /usr/src/sriracha/dest /usr/src/sriracha/dest
COPY --from=3 /usr/src/sdk/dest /usr/src/sdk/dest