FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain-vks as vks

FROM ghcr.io/foundry-rs/foundry:nightly-8c4294c1d2321e20a3543fbd9a813d47053a8303 as builder
RUN apk update && apk add --no-cache build-base git curl bash socat
WORKDIR /usr/src/contracts
RUN git init
COPY . .

COPY --from=vks /usr/src/blockchain-vks/keys /usr/src/contracts/src/core/verifier/keys

RUN forge install --no-commit \
  https://github.com/foundry-rs/forge-std \
  https://github.com/uniswap/v2-core \
  https://github.com/uniswap/v2-periphery \
  https://github.com/openzeppelin/openzeppelin-contracts \
  https://github.com/openzeppelin/openzeppelin-contracts-upgradeable \
  https://github.com/AztecProtocol/rollup-encoder \
  https://github.com/AztecProtocol/aztec-connect-bridges@23900615ee72930099959cdb82e0a89fa351ddc4
ENV MAINNET_RPC_URL='https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c'

RUN forge clean && forge build && forge test

WORKDIR /usr/src/contracts
ENTRYPOINT ["sh", "scripts/deploy_e2e.sh"]