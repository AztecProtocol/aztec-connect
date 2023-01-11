FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY block-server block-server
WORKDIR /usr/src/yarn-project/block-server
RUN yarn build && yarn formatting && yarn test
# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production > /dev/null

FROM node:18-alpine
COPY --from=builder /usr/src /usr/src
WORKDIR /usr/src/yarn-project/block-server
CMD ["yarn", "start"]
EXPOSE 80