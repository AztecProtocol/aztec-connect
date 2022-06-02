FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain:latest

FROM node:16-alpine
COPY --from=0 /usr/src/barretenberg.js/dest /usr/src/barretenberg.js/dest
COPY --from=1 /usr/src/blockchain/dest /usr/src/blockchain/dest
WORKDIR /usr/src/sdk
COPY . .
ARG COMMIT_TAG
ENV COMMIT_TAG=$COMMIT_TAG
RUN yarn install --frozen-lockfile && \
  yarn test && \
  yarn build && \
  rm -rf node_modules && \
  yarn install --frozen-lockfile --production && \
  yarn cache clean
CMD ["yarn", "start"]
EXPOSE 1234