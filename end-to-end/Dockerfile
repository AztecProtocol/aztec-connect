FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sriracha:latest
# Although this isn't used by the code, including it here ensures it's pulled
# and tagged correctly in CI for use by docker-compose. Let's call it a feature...
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/falafel:latest

FROM node:14-alpine
COPY --from=0 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
COPY --from=1 /usr/src/sdk/dest /usr/src/sdk/dest
COPY --from=2 /usr/src/blockchain/dest /usr/src/blockchain/dest
COPY --from=3 /usr/src/sriracha/dest /usr/src/sriracha/dest
WORKDIR /usr/src/end-to-end
COPY . .
RUN yarn install
CMD ["yarn", "test"]