FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY blockchain blockchain
COPY sdk sdk
RUN cd barretenberg.js && yarn build
WORKDIR /usr/src/yarn-project/sdk
ARG ARG_COMMIT_HASH
ENV COMMIT_HASH=$ARG_COMMIT_HASH
RUN yarn build && yarn formatting && yarn test
# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production > /dev/null

FROM node:18-alpine
COPY --from=builder /usr/src/yarn-project /usr/src/yarn-project
WORKDIR /usr/src/yarn-project/sdk
ENTRYPOINT ["yarn"]
CMD ["start"]
EXPOSE 1234