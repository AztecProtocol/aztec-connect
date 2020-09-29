Aztec's SDK is the gateway for developers to access the Aztec network, and benefit from low gas fees and privacy on Ethereum. The SDK connects to our ZkRollup service and can be integrated with one line of code.

The SDK is designed to abstract away the complexities of Zero-knowledge proofs from the developer and end users. It provides a simple API for creating accounts, depositing and withdrawing tokens anonymously. The core transfer inside the SDK is private by default.

Under the hood the SDK keeps track of a users private balances across multiples assets and provides easy to use helper methods to the developer to create seamless private UI's.

## Installation

The SDK requires a JavaScript context (Web Browser, WebView or NodeJs) with access to WebAssembly. Native iOS and Android bindings will be available in Q1 2021.

To install the SDK from NPM use the following command.

`yarn add @aztec/sdk`

```js
const activeSdk = await sdk.init();
console.info(activeSdk);
```

## Custom Proofs & Transactions

The SDK will be upgraded in Q4 to support custom proofs. Developers can write their own Stealth Contracts using our programming language Noir. The SDK handles compilation, proovers and calling of custom circuits. To join the alpha test list or for more information on custom proofs / cicuits please contact us here.

## Gas Costs & API Keys

The SDK uses a ZkRollup to bundle transactions together and relay to the blockchain. This saves gas and increases throughput. There is no fee for using the rollup and we will currently cover all gas costs. The free version of the rollup targets a 1 hour finality.

Users can pay a transaction fee to decrease the finality to the next block. Please contact us for a fee schedule.
