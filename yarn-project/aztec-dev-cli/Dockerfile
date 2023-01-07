FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY blockchain blockchain

COPY aztec-dev-cli aztec-dev-cli
WORKDIR /usr/src/yarn-project/aztec-dev-cli
RUN yarn build && yarn formatting && yarn test
# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production > /dev/null
RUN rm -rf /usr/src/contracts

FROM node:18-alpine
COPY --from=builder /usr/src/yarn-project /usr/src/yarn-project
WORKDIR /usr/src/yarn-project/aztec-dev-cli
ENTRYPOINT ["yarn", "start"]
CMD []