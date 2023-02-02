# AZTEC 2.0 Monorepo

The Aztec 2.0 system consists of the following sub projects.

- `barretenberg` - C++ cryptographic library.
- `barretenberg.js` - TypeScript wrapper around WASM build of barretenberg.
- `blockchain` - TypeScript for interacting with smart contracts and the blockchain.
- `contracts` - Solidity smart contracts.
- `documentation` - Documentation frontend website.
- `end-to-end` - End to end tests. Uses docker to launch a mainnet fork, falafel, and run test suite against them.
- `explorer` - Block explorer frontend website.
- `falafel` - Rollup server.
- `faucet` - ETH & ERC20 faucet for Aztec mainnet fork.
- `halloumi` - Proof generation server.
- `hummus` - Webpack proof of concept website and terminal using `sdk`.
- `iac` - Project wide Terraform (infrastructure as code).
- `kebab` - Proxy server sitting between falafel and ETH node.
- `mainframe` - Terraform and bootstrap scripts for development mainframe.
- `markdown` - General project documentation, coding standards, etc.
- `metrics` - Metrics collection tooling.
- `sdk` - SDK for interacting with a rollup provider.
- `wasabi` - Load testing tool.

### Contributing

The following documents outline how best to contribute:

- [Getting Started](./markdown/getting_started.md)
- [Development Mainframe](./mainframe/README.md)
- [PR Checklist](./markdown/pr_checklist.md)
- [Build System](./markdown/build_system.md)
