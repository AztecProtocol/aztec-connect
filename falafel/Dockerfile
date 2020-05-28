FROM aztecprotocol/barretenberg.js:latest
FROM aztecprotocol/barretenberg:x86_64-linux-clang

FROM node:12
COPY --from=1 /usr/src/barretenberg/build/src/aztec/rollup/db_cli/db_cli /usr/src/barretenberg/build/src/aztec/rollup/db_cli/db_cli
COPY --from=1 /usr/src/barretenberg/build/src/aztec/rollup/rollup_cli/rollup_cli /usr/src/barretenberg/build/src/aztec/rollup/rollup_cli/rollup_cli
COPY --from=1 /usr/src/barretenberg/srs_db/ignition /usr/src/barretenberg/srs_db/ignition
COPY --from=1 /usr/local/clang_9.0.0/lib/libc++.so.1 /usr/local/clang_9.0.0/lib/libc++.so.1
COPY --from=1 /usr/local/clang_9.0.0/lib/libc++abi.so.1 /usr/local/clang_9.0.0/lib/libc++abi.so.1
COPY --from=1 /usr/local/clang_9.0.0/lib/libomp.so /usr/local/clang_9.0.0/lib/libomp.so
ENV LD_LIBRARY_PATH /usr/local/clang_9.0.0/lib
WORKDIR /usr/src/barretenberg.js
COPY --from=0 /usr/src/barretenberg.js/dest .
RUN yarn install && yarn link
WORKDIR /usr/src/falafel
COPY package.json yarn.lock ./
RUN yarn install
RUN yarn link barretenberg
COPY . .
RUN yarn test && yarn build

# Create minimal sized runtime image.
FROM ubuntu:latest
RUN apt update && \
 apt install -y curl && \
 curl -sL https://deb.nodesource.com/setup_12.x | bash - && \
 curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
 echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
 apt update && apt install -y nodejs yarn && \
 apt clean
ENV LD_LIBRARY_PATH /usr/local/clang_9.0.0/lib
COPY --from=2 /usr/src /usr/src
COPY --from=2 /usr/local/clang_9.0.0 /usr/local/clang_9.0.0
COPY --from=2 /usr/local/share/.config /usr/local/share/.config
WORKDIR /usr/src/falafel
CMD [ "node", "./dest"]