# AZTEC 2.0 Monorepo

The Aztec 2.0 system consists of the following sub projects.

- `barretenberg` - C++ library source code.
- `barretenberg.js` - TypeScript wrapper around WASM build of barretenberg.
- `blockchain` - Solidity smart contracts and TypeScript to interact with them.
- `end-to-end` - End to end tests. Uses docker to launch ganache, falafel, and run test suite against them.
- `falafel` - Rollup server.
- `hummus` - Webpack proof of concept using `sdk` for in browser work.
- `iac` - Project wide Terraform (infrastructure as code).
- `markdown` - General project documentation, coding standards, etc.
- `sdk` - SDK for interacting with a rollup provider.

### Contributing

The following documents outline how best to contribute:

- [Getting Started](./markdown/getting_started.md)
- [PR Checklist](./markdown/pr_checklist.md)
- [Build System](./markdown/build_system.md)
