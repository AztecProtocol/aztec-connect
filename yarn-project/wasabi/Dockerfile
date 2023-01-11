FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY blockchain blockchain
COPY sdk sdk
RUN cd barretenberg.js && yarn build && cd ../sdk && yarn build

COPY wasabi wasabi
WORKDIR /usr/src/yarn-project/wasabi
RUN yarn build && yarn formatting && yarn test
# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production > /dev/null

FROM node:18-alpine
COPY --from=0 /usr/src /usr/src
WORKDIR /usr/src/yarn-project/wasabi
CMD ["yarn", "start"]