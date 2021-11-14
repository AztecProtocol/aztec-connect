FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest


FROM node:14-alpine

COPY --from=0 /usr/src/barretenberg.js/dest-es /usr/src/barretenberg.js/dest-es
COPY --from=1 /usr/src/sdk/dest-es /usr/src/sdk/dest-es
WORKDIR /usr/src/block-explorer
COPY . .

RUN yarn install && yarn test && yarn build
CMD []
