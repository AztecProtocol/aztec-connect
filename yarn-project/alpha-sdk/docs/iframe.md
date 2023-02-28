# Iframe wallet provider

There is also the possibility for the dapp to support pure iframe wallets, where the dapp creates an iframe to the desired wallet URL directly and they interact via postMessage. 

## Dapp side
The dapp can use [createIframeAztecWalletProviderClient](../src/iframe_aztec_wallet_provider/client/iframe_aztec_wallet_provider_client.ts) to open an iframe pointing to a wallet URL and get an aztec wallet provider back.
Example dapp usage:

```typescript
const aztecWalletProvider = await createIframeAztecWalletProviderClient(WALLET_URL, {
  debug: '*',
  pollInterval: 10000,
  host: SERVER_URL,
  version: SDK_VERSION,
});

await aztecWalletProvider.connect();

const accountPublicKey = await this.sdk.addAccount(aztecWalletProvider);
```

## Wallet side
In order to expose the AztecWalletProvider interface, [createIframeAztecWalletProviderServer](../src/iframe_aztec_wallet_provider/server/iframe_aztec_wallet_provider_server.ts) has to be called with a keyStore.

Example wallet usage:

```typescript
const server = createIframeAztecWalletProviderServer(await BarretenbergWasm.new(), keyStore);
// Requests for public keys or signatures will be forwarded to the keystore
server.run();
```
