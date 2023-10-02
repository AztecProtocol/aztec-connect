FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain-vks as vks

FROM ubuntu:focal as builder
RUN apt-get update && apt install -y git curl socat netcat
WORKDIR /usr/src/contracts
RUN git init
COPY . .
RUN ./scripts/install_foundry.sh
ENV PATH="/usr/src/contracts/.foundry/bin:${PATH}"

COPY --from=vks /usr/src/blockchain-vks/keys /usr/src/contracts/src/core/verifier/keys

RUN forge install --no-commit \
  https://github.com/foundry-rs/forge-std \
  https://github.com/uniswap/v2-core \
  https://github.com/uniswap/v2-periphery \
  https://github.com/openzeppelin/openzeppelin-contracts@v4.8.0 \
  https://github.com/openzeppelin/openzeppelin-contracts-upgradeable@v4.8.0 \
  https://github.com/AztecProtocol/rollup-encoder@main \
  https://github.com/AztecProtocol/aztec-connect-bridges@master
ENV MAINNET_RPC_URL='https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c'

RUN forge clean && forge build && forge test && REFERENCE=true forge test 

WORKDIR /usr/src/contracts
CMD ["./scripts/deploy_contracts.sh"]