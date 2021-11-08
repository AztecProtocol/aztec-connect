FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest

FROM node:14-alpine AS builder
RUN apk update && apk add --no-cache build-base git python3
COPY --from=0 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
WORKDIR /usr/src/blockchain
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build && yarn test
RUN rm -rf node_modules && yarn install --frozen-lockfile --production

FROM node:14-alpine
COPY --from=builder /usr/src/blockchain /usr/src/blockchain
WORKDIR /usr/src/blockchain
CMD ["yarn", "-s", "deploy", "1"]