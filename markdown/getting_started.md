# Getting Started

The simplest way to get started is to first get connected to the development mainframe which has all requisite
toolchains installed, and will be updated if newer versions of tools are required etc.

Instructions for getting connected to mainframe are [here](../mainframe/README.md).

If however, you wish to be able to develop without the mainframe, you can install the following dependencies:

- nvm
- yarn
- node >= 14
- cmake >= 3.16
- clang >= 9

On MacOS:

```
brew install llvm cmake
```

On Ubuntu >= 20:

```
apt-get update && apt-get install -y gcc g++ clang cmake zsh python
```

### Building

There are quite a few moving parts to the system. Getting them all working together is a little involved. The quickest
way to get started is to just run the `bootstrap.sh` script in the root of the repository.

The script will run the bootstrap scripts in each relevant subdirectory.
Each script will build it's project, and where relevant use `yarn link` to link TypeScript repositories together.

Some TypeScript projects have two builds. Standard Commonjs imports and ES6 module imports. The later is required by
webpack. For development purposes, you can mostly ignore the existence of the ES6 builds. Projects will all be linked
together using the Commonjs builds.

Webpack projects should still `yarn link` to the Commonjs builds, but use `alias` configurations in development
configurations to then replace imports of libraries with their ES6 versions, and be sure to import ES6 version
in `package.json` for production builds.

### Aztec Connect Cpp

This is our C++ codebase. The script will create two build directories `build` and `build-wasm`.
The relevant binaries are:

- `./build/bin/rollup_cli`
- `./build/bin/db_cli`
- `./build/bin/tx_factory`
- `./build/bin/keygen`
- `./build-wasm/bin/aztec-connect.wasm`

`rollup_cli` is the rollup proof generator. `db_cli` is the merkle tree database. `keygen` is used to create the
solidity verification key contracts.

It is currently essential that the same compilier is used to build `rollup_cli` and `aztec-connect.wasm`, as `rollup_cli`
independently computes the verification key for the inner proofs, and gcc and clang will actually produce different
circuits due to them differing in expression evaluation orders. As we can currently only build the WASM with clang,
you must use clang to build `rollup_cli` as well. The bootstrap script will use clang as default.

During development you may find yourself needing to rebuild these binaries as they change.

```
cmake --build build      --parallel --target rollup_cli --target db_cli --target tx_factory --target keygen
cmake --build build-wasm --parallel --target aztec-connect.wasm
```

### Barretenberg

This is our C++ cryptography library. The script will create two build directories `build` and `build-wasm`.
The relevant libraries are:

- `./build/lib/libbarretenberg.a`
- `./build/lib/libenv.a`
- `./build/lib/lib*.a`
- `./build-wasm/lib/libbarretenberg.a`
- `./build-wasm/lib/libenv.a`
- `./build-wasm/lib/lib*.a`

`libbarretenberg.a` is the full library archive of the barretenberg code. Other `lib*.a` are smaller partial libararies.

During development you may find yourself needing to rebuild these binaries as they change. Generally you can just rebuild the Aztec Connect Cpp binaries, but you can also build the barretenberg libraries directly.

```
cmake --build build      --parallel --target barretenberg --target env
cmake --build build-wasm --parallel --target barretenberg --target env
```

### Barrentenberg.js

TypeScript wrapper around `aztec-connect.wasm`. There is a symlink to the built WASM file at
`./src/wasm/aztec-connect.wasm`. The build directory `dest` will end up with copies of the
actual artifact. Running `yarn symlink-wasm` replaces it with a symlink. The bootstrap script does this as default.

During development you'll want to run `yarn build:dev` to watch and rebuild both builds as files change.

### Blockchain

Contains smart contracts, deployment scripts, and TypeScript wrappers. It exposes a script `deploy_rollup_processor`
to any dependent projects. This script will deploy the contracts, and output text to standard output, which when
executed in a shell, exports environment variables containing the contract addresses.

During development you'll want to run `yarn build:dev` to watch and rebuild both builds as files change.

If you change the contracts, you'll need to run `yarn compile` to recompile.

If you change the circuits in `barretenberg` or `aztec-connect-cpp`, you'll need to run `generate_vks.sh` to regenerate the verification key contracts.

### Falafel

The rollup server.

During development you'll want to run `yarn start:dev` to watch and rebuild as files change.

If running against a real blockchain such as ganache, you'll want to deploy to ganache first:

```
export ETHEREUM_HOST=http://localhost:8545
export ROLLUP_HOST: http://localhost:8081
yarn clean_db && `yarn -s deploy_rollup_processor` && ROLLUP_SIZE=1 MAX_ROLLUP_WAIT_TIME=0 yarn start:dev
```

This is useful for running the end to end tests.

### Sdk

During development you'll want to run `yarn build:dev` to watch and rebuild both builds as files change.

### End-to-end

Ensure you've installed ganache globally:

```
yarn global add ganache-cli
```

Run a local ganache instance.

```
ganache-cli -d
```

Run `falafel` as above. Run `yarn test ./src/e2e.test.ts` to run the tests.

### Hummus

Run `falafel`. It doesn't need to be against a real blockchain. Run `yarn start:dev` to launch the dev server.
