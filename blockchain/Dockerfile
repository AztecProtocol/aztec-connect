FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY blockchain blockchain
WORKDIR /usr/src/yarn-project/blockchain
RUN yarn build && yarn formatting && yarn test

FROM node:18-alpine
COPY --from=builder /usr/src/yarn-project/blockchain /usr/src/yarn-project/blockchain