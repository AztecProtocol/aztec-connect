FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg-x86_64-linux-clang
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain-vks

FROM node:14-alpine AS builder
RUN apk update && apk add --no-cache build-base git python3 curl bash
COPY --from=0 /usr/src/barretenberg/ /usr/src/barretenberg
COPY --from=1 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
COPY --from=2 /usr/src/blockchain-vks/keys /usr/src/blockchain-vks/keys
WORKDIR /usr/src/blockchain
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN cp /usr/src/blockchain-vks/keys/* /usr/src/blockchain/contracts/verifier/keys
RUN yarn build
CMD ["yarn", "test"]

FROM node:14-alpine
COPY --from=builder /usr/src/blockchain /usr/src/blockchain
WORKDIR /usr/src/blockchain
CMD ["yarn", "-s", "deploy"]
