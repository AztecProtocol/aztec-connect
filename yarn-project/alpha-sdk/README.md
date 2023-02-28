# Aztec Alpha SDK

This is an alpha version of the [Aztec SDK](../sdk/README.md)

It is published under `@aztec/alpha-sdk`. It allows dapp developers to interface with external wallets, avoiding the responsibility of having to deal with key generation and storage.

## How to use the Alpha SDK

With this sdk, instead of adding keys to the sdk directly using `addUser()`, accounts are represented as objects that conform to the AztecWalletProvider interface. When adding an account to the sdk, you can call `addAccount(aztecWalletProvider: AztecWalletProvider)` with a valid wallet provider.

### Wallet Provider

A wallet provider for the Aztec SDK has to implement [the AztecWalletProvider interface](./src/aztec_wallet_provider/aztec_wallet_provider.ts). It serves as a middleware between the SDK and the keystore, and it also typically implements the transport to the wallet.

It's used by the SDK whenever it needs to perform any account-related task, such as fetching public keys, signing proofs, creating proofs, and getting the decrypted notes of a block segment.

There are two main wallet provider implementations in the SDK, the vanilla implementation and the AztecWalletProvider client.

The [vanilla implementation](./src/aztec_wallet_provider/vanilla_aztec_wallet_provider.ts) holds a local keystore. It can be used if the keystore and the SDK are running in the same context, for example during testing.

### Aztec Wallet Provider Client

This class implements the AztecWalletProvider interface over an [ethereum provider interface](../barretenberg.js/src/blockchain/ethereum_provider.ts). The implementation can be found [here](./src/eip1193_aztec_wallet_provider/client/eip1193_aztec_wallet_provider_client.ts). It allows dapp developers to create an AztecWalletProvider using any Ethereum provider, such as walletconnect or an injected wallet connector.

In order to adapt a walletconnect 2.0 SignClient to our Ethereum provider interface, there is a [EIP1193SignClient](./src/eip1193_aztec_wallet_provider/client/eip1193_sign_client.ts) class available.

Example usage using walletconnect 2.0 on the dapp side:

```typescript
// Create a WalletConnect proposal
const { uri, approval } = await signClient.connect({
  requiredNamespaces: {
    aztec: {
      methods: [],
      chains: [`aztec:${aztecChainId}`],
      events: RPC_METHODS,
    },
  },
});

await web3Modal.openModal({ uri, standaloneChains: chains });

// Wait until the wallet accepts the proposal
const session = await approval();

web3Modal.closeModal();

// Create the client
const awpClient = new AztecWalletProviderClient(new EIP1193SignClient(signClient, aztecChainId, session));

const aztecWalletProvider = await awpClient.init();

await aztecWalletProvider.connect();

const accountPublicKey = await sdk.addAccount(aztecWalletProvider);
```

Now that the account is added to the SDK, we can use it in a controller:

```typescript
const spendingPublicKey = await aztecWalletProvider.getSpendingPublicKey();
// Register the account
const controller = sdk.createRegisterController(
  accountPublicKey,
  alias, // user-provided alias
  spendingPublicKey,
  undefined, // no recovery public key
  deposit, // an eth deposit with the register
  fee,
  depositor, // the ethereum address that deposits
  aztecWalletProvider,
);
```

There is a complete example in [this repo](https://github.com/AztecProtocol/aztec-frontend-boilerplate/tree/jc/new-sdk).

## Other guides

For wallet developers, an explanation of the utilities available to handle dapp connections can be found [here](./docs/wallet.md).

If you are looking for information about how to use and create iframe wallets (legacy) you can find it [here](./docs/iframe.md).
