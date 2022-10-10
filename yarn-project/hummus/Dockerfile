FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY blockchain blockchain
COPY sdk sdk
# Remove need to compile contracts once they're fully in foundry and abis are added to yarn-project-base.
RUN cd barretenberg.js && yarn build && cd ../blockchain && yarn compile && cd ../sdk && yarn build

COPY hummus hummus
WORKDIR /usr/src/yarn-project/hummus
RUN yarn build && yarn formatting && yarn test
# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production

FROM node:18-alpine
COPY --from=builder /usr/src/yarn-project /usr/src/yarn-project
WORKDIR /usr/src/yarn-project/hummus
CMD ["yarn", "start"]
EXPOSE 8080