FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS base
COPY barretenberg.js barretenberg.js
COPY contracts-verifier-test contracts-verifier-test

WORKDIR /usr/src/yarn-project/contracts-verifier-test
RUN yarn start

FROM ghcr.io/foundry-rs/foundry:nightly-a44aa13cfc23491ba32aaedc093e9488c1a6db43 as builder

COPY --from=base /usr/src/yarn-project/contracts-verifier-test /usr/src/yarn-project/contracts-verifier-test
COPY --from=base /usr/src/contracts/src/core /usr/src/yarn-project/contracts-verifier-test/src/core

RUN apk update && apk add --no-cache build-base git

WORKDIR /usr/src/yarn-project/contracts-verifier-test

RUN git init
RUN rm -rf lib && forge install --no-commit \
  https://github.com/foundry-rs/forge-std \
  https://github.com/openzeppelin/openzeppelin-contracts \
  https://github.com/openzeppelin/openzeppelin-contracts-upgradeable \
  https://github.com/AztecProtocol/rollup-encoder

RUN forge test