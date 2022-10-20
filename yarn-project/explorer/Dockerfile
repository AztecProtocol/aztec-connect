FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY barretenberg.js barretenberg.js
COPY blockchain blockchain
COPY sdk sdk
# Remove need to compile contracts once they're fully in foundry and abis are added to yarn-project-base.
RUN cd barretenberg.js && yarn build && cd ../blockchain && yarn compile && cd ../sdk && yarn build

COPY explorer explorer
WORKDIR /usr/src/yarn-project/explorer
RUN yarn build && yarn formatting

FROM node:18-alpine
COPY --from=0 /usr/src/yarn-project/explorer/dest /usr/src/yarn-project/explorer/dest
