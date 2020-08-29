yarn install
yarn build
yarn symlink-wasm
cd dest && { yarn unlink 2> /dev/null || true; } && yarn link