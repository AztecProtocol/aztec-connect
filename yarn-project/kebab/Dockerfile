FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY blockchain blockchain

COPY kebab kebab
WORKDIR /usr/src/yarn-project/kebab
RUN yarn build && yarn formatting
# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production > /dev/null

FROM node:18-alpine
RUN apk add curl jq
COPY --from=builder /usr/src/yarn-project /usr/src/yarn-project
WORKDIR /usr/src/yarn-project/kebab
ENTRYPOINT ["yarn"]
CMD ["start"]
EXPOSE 8545