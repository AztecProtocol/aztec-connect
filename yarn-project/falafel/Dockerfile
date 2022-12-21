FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY blockchain blockchain
COPY halloumi halloumi
COPY falafel falafel
RUN cd barretenberg.js && yarn build
WORKDIR /usr/src/yarn-project/falafel
RUN yarn build && yarn formatting && yarn test
# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production

FROM node:18-alpine
RUN apk update && apk add --no-cache llvm15-libs
COPY --from=builder /usr/src /usr/src
WORKDIR /usr/src/yarn-project/falafel
CMD ["yarn", "start"]
EXPOSE 80