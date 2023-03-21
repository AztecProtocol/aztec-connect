# Aztec Connect (v2.1) Monorepo

- `aztec-connect-cpp` - C++ proof generators and merkle tree db.
- `blockchain-vks` - Generates verification key smart contracts.
- `contracts` - Solidity smart contracts.
- `yarn-project/account-migrator` - Builds initial data tree with accounts from v2.0.
- `yarn-project/alpha-sdk` - Alpha version of SDK to enable dapp developers to interface with external wallets.
- `yarn-project/aztec-dev-cli` - Development cli tool.
- `yarn-project/barretenberg.js` - Wrapper around barretenberg wasm and assorted low level libs.
- `yarn-project/blockchain` - TypeScript for interacting with smart contracts and the blockchain.
- `yarn-project/end-to-end` - End to end tests. Uses docker to launch a mainnet fork, falafel, and run test suite against them.
- `yarn-project/falafel` - Rollup server.
- `yarn-project/halloumi` - Proof generation server.
- `yarn-project/hummus` - Webpack proof of concept website and terminal using `sdk`.
- `yarn-project/kebab` - Proxy server sitting between falafel and ETH node.
- `yarn-project/sdk` - SDK for interacting with a rollup provider.
- `yarn-project/wasabi` - Load testing tool.

## Bug Bounties and Vulnerability Reporting

We are currently running a Bug Bounty Program. For all information, please visit [immunefi](https://immunefi.com/bounty/aztecnetwork/).

## Audit reports

See audit reports [here](https://github.com/AztecProtocol/aztec-security/tree/main/Audits)

| Title             | Vendor              | Report                                                                                                                                  |
| ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Rollup Processor  | Arbitrary Execution | [link](https://github.com/AztecProtocol/aztec-security/blob/main/Audits/Aztec_20221014.pdf)                                             |
| Rollup Processor  | Solidified          | [link](<https://github.com/AztecProtocol/aztec-security/blob/main/Audits/Audit%20Report%20-%20Aztec%20(1).pdf>)                         |
| Aave Bridge       | Solidified          | [link](https://github.com/AztecProtocol/aztec-security/blob/main/Audits/Audit%20Report%20-%20Aztec%20Aave%20Bridge.pdf)                 |
| Compound Bridge   | Solidified          | [link](https://github.com/AztecProtocol/aztec-security/blob/main/Audits/Audit%20Report%20-%20Aztec%20Compound%20Bridge.pdf)             |
| Curve Bridge      | Solidified          | [link](https://github.com/AztecProtocol/aztec-security/blob/main/Audits/Audit%20Report%20-%20Aztec%20Curve%20Bridge.pdf)                |
| DCA Bridge        | Solidified          | [link](https://github.com/AztecProtocol/aztec-security/blob/main/Audits/Audit%20Report%20-%20Aztec%20DCA%20Bridge.pdf)                  |
| Element Bridge    | Solidified          | [link](https://github.com/AztecProtocol/aztec-security/blob/main/Audits/Audit%20Report%20-%20Aztec%20Element%20Bridge.pdf)              |
| Lido Bridge       | Solidified          | [link](https://github.com/AztecProtocol/aztec-security/blob/main/Audits/Audit%20Report%20-%20Aztec%20Lido%20Bridge.pdf)                 |
| Liquity Bridge    | Solidified          | [link](https://github.com/AztecProtocol/aztec-security/blob/main/Audits/Audit%20Report%20-%20Aztec%20Liquity%20Bridge.pdf)              |
| Liquity Bridge #2 | Solidified          | [link](https://github.com/AztecProtocol/aztec-security/blob/main/Audits/Audit%20Report%20-%20Aztec%20Liquity%20Trove%20Bridge%20II.pdf) |
| Set Bridge        | Solidified          | [link](https://github.com/AztecProtocol/aztec-security/blob/main/Audits/Audit%20Report%20-%20Aztec%20Set%20Bridge.pdf)                  |
| Rollup Subsidy    | Solidified          | [link](https://github.com/AztecProtocol/aztec-security/blob/main/Audits/Audit%20Report%20-%20Aztec%20Subsidy%20Contract.pdf)            |