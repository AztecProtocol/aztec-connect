FROM 278380418400.dkr.ecr.us-east-2.amazonaws.com/barretenberg:wasm-linux-clang

FROM node:12-alpine
WORKDIR /usr/src/barretenberg.js
COPY . .
COPY --from=0 /usr/src/barretenberg/build/src/aztec/barretenberg.wasm ./src/wasm/barretenberg.wasm
RUN yarn install && DEBUG=bb:* yarn test --runInBand && yarn build && rm -rf node_modules && yarn cache clean