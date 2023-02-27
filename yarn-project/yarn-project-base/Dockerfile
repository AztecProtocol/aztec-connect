FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/aztec-connect-cpp-x86_64-linux-clang
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/aztec-connect-cpp-wasm-linux-clang
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain-vks
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/contracts

FROM node:18-alpine
RUN apk update && apk add --no-cache build-base git python3 curl bash jq
COPY --from=0 /usr/src/aztec-connect-cpp/barretenberg/cpp/srs_db/ignition /usr/src/aztec-connect-cpp/barretenberg/cpp/srs_db/ignition
COPY --from=0 /usr/src/aztec-connect-cpp/barretenberg/cpp/srs_db/download_ignition.sh /usr/src/aztec-connect-cpp/barretenberg/cpp/srs_db/download_ignition.sh
COPY --from=0 /usr/src/aztec-connect-cpp/build/bin /usr/src/aztec-connect-cpp/build/bin
COPY --from=1 /usr/src/aztec-connect-cpp/build/bin /usr/src/aztec-connect-cpp/build-wasm/bin
COPY --from=2 /usr/src/blockchain-vks/keys /usr/src/blockchain-vks/keys
COPY --from=3 /usr/src/contracts /usr/src/contracts
WORKDIR /usr/src/yarn-project
# We only want to copy the package.json's, to ensure we only rebuild this image if project dependencies changed.
COPY account-migrator/package.json account-migrator/package.json
COPY barretenberg.js/package.json barretenberg.js/package.json
COPY blockchain/package.json blockchain/package.json
COPY aztec-dev-cli/package.json aztec-dev-cli/package.json
COPY contracts-verifier-test/package.json contracts-verifier-test/package.json
COPY halloumi/package.json halloumi/package.json
COPY kebab/package.json kebab/package.json
COPY falafel/package.json falafel/package.json
COPY block-server/package.json block-server/package.json
COPY nym-gateway/package.json nym-gateway/package.json
COPY sdk/package.json sdk/package.json
COPY hummus/package.json hummus/package.json
COPY end-to-end/package.json end-to-end/package.json
COPY wallet/package.json wallet/package.json
COPY wasabi/package.json wasabi/package.json
# All workspaces use the linting config, so always include it.
COPY eslint-config eslint-config
COPY .pnp.cjs .pnp.loader.mjs .yarnrc.yml package.json babel.config.json yarn.lock .prettierrc.js ./
COPY .yarn .yarn
# Although we're attempting to be "zero-install", in practice we still need to build arch specific packages.
RUN yarn --immutable
# If everything's worked properly, we should no longer need access to the network.
RUN echo "enableNetwork: false" >> .yarnrc.yml

# Yarn devs won't provide an extremely simple and useful feature of pruning dev dependencies from the local cache:
# https://github.com/yarnpkg/berry/issues/1789
#
# To work around this, we construct a global cache from the local cache using hard links (requires a hacky rename).
# When we build an upstream docker image, we:
# - Do the build.
# - Erase the local cache with a `yarn cache clean`. Files remain in global cache due to hard link.
# - Do a `yarn workspaces focus --production` to install production dependencies from the global cache, to .yarn/cache
# - A final stage of the build strips away the global cache.
RUN /bin/bash -c '\
[ -d /root/.yarn/berry/cache ] && exit 0; \
cd .yarn/cache && \
mkdir -p /root/.yarn/berry/cache && \
for F in *; do \
  [[ $F =~ (.*-) ]] && ln $F /root/.yarn/berry/cache/${BASH_REMATCH[1]}8.zip; \
done'