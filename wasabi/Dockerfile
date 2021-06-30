FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain:latest

FROM node:14-alpine AS builder
COPY --from=0 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
COPY --from=1 /usr/src/sdk/dest /usr/src/sdk/dest
COPY --from=2 /usr/src/blockchain/dest /usr/src/blockchain/dest
WORKDIR /usr/src/wasabi
COPY . .
RUN yarn install && yarn test && yarn build && rm -rf node_modules && yarn install --production

FROM node:14-alpine
COPY --from=builder /usr/src /usr/src
WORKDIR /usr/src/wasabi
CMD ["yarn", "start"]
