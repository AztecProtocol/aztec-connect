FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest

FROM node:14-alpine
COPY --from=0 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
COPY --from=1 /usr/src/sdk/dest /usr/src/sdk/dest
WORKDIR /usr/src/block-explorer
COPY . .

RUN yarn install && yarn build
CMD []
