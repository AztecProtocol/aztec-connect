FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY blockchain blockchain
COPY kebab kebab
RUN yarn
# Remove need to compile contracts once they're fully in foundry and abis are added to yarn-project-base.
WORKDIR /usr/src/yarn-project/blockchain
RUN yarn compile
WORKDIR /usr/src/yarn-project/kebab
RUN yarn build && yarn formatting
# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production

FROM node:18-alpine
COPY --from=builder /usr/src/yarn-project /usr/src/yarn-project
WORKDIR /usr/src/yarn-project/kebab
CMD ["yarn", "start"]
EXPOSE 8545