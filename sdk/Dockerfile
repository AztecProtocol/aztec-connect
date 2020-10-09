FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sriracha:latest

FROM node:14.8.0-alpine
COPY --from=0 /usr/src/barretenberg.js/dest-es /usr/src/barretenberg.js/dest-es
COPY --from=1 /usr/src/blockchain/dest-es /usr/src/blockchain/dest-es
COPY --from=2 /usr/src/sriracha/dest-es /usr/src/sriracha/dest-es
WORKDIR /usr/src/sdk
COPY . .
RUN yarn install && yarn test --runInBand && yarn build && yarn bundle && rm -rf node_modules && yarn cache clean