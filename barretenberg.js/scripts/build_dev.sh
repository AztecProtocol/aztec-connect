#!/bin/bash

yarn clean

# Kick off building source to ./dest for upstream projects.
tsc -p tsconfig.dest.json --watch &

# Kick off building ./dest/wasm/web_worker.js for upstream projects.
webpack watch --config webpack.config.prod.js &

# Kick off building ./src/wasm/node_worker.js.
# Needed for unit tests until node 18 + yarn pnp + ts-node chained loader stuff works.
webpack watch --config webpack.config.dev.js &

wait