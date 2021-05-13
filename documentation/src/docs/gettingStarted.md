Aztec's SDK is the gateway for developers to access the Aztec network. The SDK lets end users benefit from low gas fees and privacy on Ethereum. The SDK connects to our ZkRollup service and can be integrated with one line of code.

The SDK is designed to abstract away the complexities of Zero-knowledge proofs from the developer and end users. It provides a simple API for creating accounts, depositing and withdrawing tokens anonymously. The core transfer inside the SDK is private by default.

Under the hood the SDK keeps track of a users private balances across multiples assets and provides easy to use helper methods to the developer to create seamless private user experiences.

## Installation

The SDK requires a JavaScript context (Web Browser, WebView or NodeJs) with access to WebAssembly. Native iOS and Android bindings will be available in Q1 2021.

To install the SDK from NPM use the following command.

```bash
yarn add @aztec/sdk
```

<br/>

## Creating Wallet SDK

```js
import { createWalletSdk } from '@aztec/sdk';

const rollupProviderUrl = 'SERVER_URL';
const aztecSdk = await createWalletSdk(window.ethereum, rollupProviderUrl);

console.info(aztecSdk.getLocalStatus());
// initState: 'UNINITIALIZED'

await aztecSdk.init();

console.info(aztecSdk.getLocalStatus());
// initState: 'INITIALIZED'

await aztecSdk.destroy();

console.info(aztecSdk.getLocalStatus());
// initState: 'DESTROYED'
```

## Developing Web Apps

If your app runs in the browsers, you'll need to host the wasm file and worker file within the same domain as your app. If you are using webpack, simply include the following code to your webpack config:

```js static
// webpack.config.js
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/@aztec/sdk/*.(wasm|worker.js)',
          to: '[name].[ext]',
        },
      ],
    }),
  ],
};
```

## Custom Proofs & Transactions

The SDK will be upgraded in Q1 2020 to support custom proofs, that can interact with Layer 1. Developers can write their own private contracts using our programming language Noir. The SDK handles the compilation and generating proofs as well as sending txs to the rollup provider To join the alpha test list or for more information on custom proofs / cicuits please contact us.

- **[Custom Circuits](/#/Custom%20Circuits)**

## Gas Costs & API Keys

The SDK uses a ZkRollup to bundle transactions together and relay to the blockchain. This saves gas and increases throughput. There is no fee for using the rollup and we will currently cover all gas costs. The free version of the rollup targets a 1 hour finality.

Users can pay a transaction fee to decrease the finality to the next block. Please contact us for a fee schedule.

## See Also

- **[WalletSDK Interface](/#/Types/WalletSdk)**
- **[User](/#/User)**
- **[ERC20 Tokens](/#/zkAssets)**
