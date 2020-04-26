FROM aztecprotocol/barretenberg:wasm-linux-clang
FROM node:12
WORKDIR /usr/src/barretenberg.js
COPY . .
COPY --from=0 /usr/src/barretenberg/build/src/aztec/barretenberg.wasm ./src/wasm/barretenberg.wasm
RUN yarn install && yarn test