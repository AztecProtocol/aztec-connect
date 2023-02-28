# Aztec wallets

The sdk provides some utilities to make developing a wallet for aztec connect easier. The two main utilities are the KeyStore and the WalletConnect Aztec Wallet Provider Server.

A full walletconnect-enabled web+iframe wallet example can be found [in this repo](https://github.com/AztecProtocol/wallet-ui).

## KeyStore

The KeyStore purpose is to generate, use and export the Account and spending keys of an user. It has to implement [this interface](../src/key_store/key_store.ts).

There are two versions of the keystore:

- The legacy keystore ([code](../src/key_store/legacy_key_store.ts)): The account key and the spending key are generated from the signature of a message with an ethereum private key
- The Aztec keystore ([code](../src/key_store/aztec_key_store.ts)):
  - The account and spending keys are generated using browser-provided randomness
  - The keys can be exported encrypted with a password
  - A recovery kit can be generated that, if you control the ethereum key it was generated with, allows to recover the account key and the funds associated with the account

## WalletConnect Aztec Wallet Provider Server

This class allows a walletconnect+iframe Aztec wallet to offer the AztecWalletProvider interface by providing it a walletconnect SignClient, a KeyStore, and a RollupProvider. The implementation can be found [here](../src/eip1193_aztec_wallet_provider/server/walletconnect_aztec_wallet_provider_server.ts).

This server will interface with the provided keystore, requesting for approval when necessary (using approveProofsRequest and approveProofInputsRequest).

Example usage on the wallet side:

```typescript
const aztecAWPServer = new WalletConnectAztecWalletProviderServer();

aztecAWPServer.setClient(signClient);

// The server will start forwarding requests for public keys or signatures to the keystore
await aztecAWPServer.initWalletProvider(
  keyStore,
  new ServerRollupProvider(new URL(process.env.ROLLUP_HOST)),
  wasm,
);

```
