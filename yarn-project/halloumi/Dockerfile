FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY halloumi halloumi
WORKDIR /usr/src/yarn-project/halloumi
RUN yarn build && yarn formatting && yarn test
# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production > /dev/null

FROM node:18-alpine
RUN apk update && apk add --no-cache llvm15-libs
COPY --from=builder /usr/src /usr/src
WORKDIR /usr/src/yarn-project/halloumi
CMD ["yarn", "start"]
EXPOSE 80