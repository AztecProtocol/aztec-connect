FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sriracha:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest

FROM node:12-alpine
COPY --from=0 /usr/src/barretenberg.js/dest-es /usr/src/barretenberg.js/dest-es
COPY --from=1 /usr/src/blockchain/dest-es /usr/src/blockchain/dest-es
COPY --from=2 /usr/src/sriracha/dest-es /usr/src/sriracha/dest-es
COPY --from=3 /usr/src/sdk/dest-es /usr/src/sdk/dest-es
WORKDIR /usr/src/documentation
COPY . .

RUN yarn install && yarn test && yarn build
CMD []
