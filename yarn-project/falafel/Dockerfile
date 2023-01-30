FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY blockchain blockchain
COPY halloumi halloumi
RUN cd barretenberg.js && yarn build

COPY falafel falafel
WORKDIR /usr/src/yarn-project/falafel
ARG ARG_COMMIT_HASH
ENV COMMIT_HASH=$ARG_COMMIT_HASH
RUN yarn build && yarn formatting && yarn test
# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production > /dev/null
RUN rm -rf /usr/src/contracts

FROM node:18-alpine
RUN apk update && apk add --no-cache llvm15-libs curl jq
COPY --from=builder /usr/src /usr/src
WORKDIR /usr/src/yarn-project/falafel
ENTRYPOINT ["yarn"]
CMD ["start"]
EXPOSE 80