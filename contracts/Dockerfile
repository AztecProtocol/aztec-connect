FROM ghcr.io/foundry-rs/foundry:nightly-52b57b14c4c64a61fff8efa167d2a7937b191ce8 as builder
RUN apk update && apk add --no-cache build-base git curl bash 
WORKDIR /usr/src/contracts
RUN git init
COPY . .
RUN forge install --no-commit \
  https://github.com/foundry-rs/forge-std \
  https://github.com/uniswap/v2-core \
  https://github.com/uniswap/v2-periphery \
  https://github.com/openzeppelin/openzeppelin-contracts \
  https://github.com/openzeppelin/openzeppelin-contracts-upgradeable \
  https://github.com/AztecProtocol/rollup-encoder
ENV MAINNET_RPC_URL='https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c'
RUN forge clean && forge build && forge test

FROM alpine:latest
COPY --from=builder /usr/src/contracts /usr/src/contracts