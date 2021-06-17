FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest

# Although this isn't used by the code, including it here ensures it's pulled
# and tagged correctly in CI for use by docker-compose. Let's call it a feature...

FROM node:14.8.0-alpine
COPY --from=0 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
COPY --from=1 /usr/src/sdk/dest /usr/src/sdk/dest
WORKDIR /usr/src/block-explorer
COPY . .

RUN yarn install && yarn build
CMD []
