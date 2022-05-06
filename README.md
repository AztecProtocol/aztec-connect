# AZTEC 2.0 Monorepo

The Aztec 2.0 system consists of the following sub projects.

- `barretenberg` - C++ cryptographic library.
- `barretenberg.js` - TypeScript wrapper around WASM build of barretenberg.
- `explorer` - Block explorer frontend website.
- `blockchain` - Solidity smart contracts and TypeScript to interact with them.
- `documentation` - Documentation frontend website.
- `end-to-end` - End to end tests. Uses docker to launch ganache, falafel, and run test suite against them.
- `falafel` - Rollup server.
- `hummus` - Webpack proof of concept website and terminal using `sdk`.
- `iac` - Project wide Terraform (infrastructure as code).
- `mainframe` - Terraform and bootstrap scripts for development mainframe.
- `markdown` - General project documentation, coding standards, etc.
- `sdk` - SDK for interacting with a rollup provider.
- `website` - Company website.

### Contributing

The following documents outline how best to contribute:

- [Getting Started](./markdown/getting_started.md)
- [Development Mainframe](./mainframe/README.md)
- [PR Checklist](./markdown/pr_checklist.md)
- [Build System](./markdown/build_system.md)
