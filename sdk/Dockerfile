FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest

FROM node:12-alpine
COPY --from=0 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
WORKDIR /usr/src/sdk
COPY . .
RUN yarn install && yarn test --runInBand && yarn build && rm -rf node_modules && yarn cache clean