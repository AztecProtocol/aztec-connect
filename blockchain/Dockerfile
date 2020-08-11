FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest

# Temporarily use ubuntu linux instead of alpine due to latest ethereumjs-util bug on alpine.
FROM node:10 AS builder
# FROM node:10-alpine AS builder
# RUN apk update && apk add --no-cache build-base git python
COPY --from=0 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
WORKDIR /usr/src/blockchain
COPY . .
RUN yarn install && yarn compile && yarn build && yarn test && rm -rf node_modules && yarn install --production && yarn cache clean

FROM alpine:latest
COPY --from=builder /usr/src/blockchain /usr/src/blockchain