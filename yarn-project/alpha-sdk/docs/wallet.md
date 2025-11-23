# 🛡️ Aztec Connect Wallet Development Utilities

The Aztec SDK provides essential utilities to streamline the development of wallets for the Aztec Connect privacy layer. The primary components designed to facilitate this integration are the **KeyStore** and the **WalletConnect Aztec Wallet Provider Server (AWPS)**.

A complete, production-ready example of a WalletConnect-enabled web and iframe wallet can be referenced [in this repository](https://github.com/AztecProtocol/wallet-ui).

---

## 🔑 KeyStore: Managing User Credentials

The **KeyStore** is the core utility responsible for managing a user's cryptographic keys within the Aztec ecosystem. Its main functionalities include key **generation**, **usage** (signing/derivation), and **export**.

All concrete implementations of the KeyStore must adhere to [the standard interface](../src/key_store/key_store.ts).

### KeyStore Implementations

The SDK currently supports two distinct key management approaches:

| Implementation | Key Generation Source | Key Storage & Recovery | Use Case |
| :--- | :--- | :--- | :--- |
| **Legacy KeyStore** | Signature derived from an **Ethereum private key**. | No built-in encryption or recovery. Keys are deterministic. | Primarily for backward compatibility or simple testing. |
| **Aztec KeyStore** | Generated using **browser-provided randomness**. | Supports password-encrypted key export and **Recovery Kits**. | Recommended for new wallets requiring robust security and recovery features. |

> **Recovery Kit:** A mechanism generated using an associated Ethereum key. Controlling this Ethereum key allows a user to recover their Account Key and the funds associated with their Aztec account, providing a strong security fallback.

---

## 🔗 WalletConnect Aztec Wallet Provider Server (AWPS)

The `WalletConnectAztecWalletProviderServer` class is the integration layer that bridges the WalletConnect protocol with the Aztec Provider interface. It allows an Aztec wallet (running typically in an iframe) to seamlessly offer the **AztecWalletProvider** interface to dApps.

This class requires three main dependencies: a WalletConnect **SignClient**, a **KeyStore**, and a **RollupProvider**.

The implementation details can be found [here](../src/eip1193_aztec_wallet_provider/server/walletconnect_aztec_wallet_provider_server.ts).

### Interaction and Approval Flow

The AWPS handles incoming requests (like transactions or viewing keys) from dApps and interfaces directly with the provided KeyStore. **Crucially, the server mediates security by requesting user confirmation:**

* **`approveProofsRequest`:** Approval for transactions or state-changing operations that require a zero-knowledge proof.
* **`approveProofInputsRequest`:** Approval for the input data used to construct a zero-knowledge proof.

> The wallet UI must implement handlers to intercept these approval requests and present the necessary confirmation prompt to the end-user.

### Example Usage (Wallet Side)

The following example demonstrates how to initialize and activate the AWPS:

```typescript
import {
    WalletConnectAztecWalletProviderServer,
    ServerRollupProvider,
    AztecKeyStore,
} from '@aztec/sdk'; // Assuming necessary imports from SDK

// 1. Instantiate the server.
const aztecAWPServer = new WalletConnectAztecWalletProviderServer();

// 2. Set up the WalletConnect client connection.
aztecAWPServer.setClient(signClient); // 'signClient' is the pre-configured WalletConnect SignClient instance.

// 3. Initialize the wallet provider with necessary dependencies.
// Note: 'wasm' refers to the pre-compiled Aztec WebAssembly module required for cryptographic operations.
await aztecAWPServer.initWalletProvider(
    keyStore, // The KeyStore instance (e.g., a new AztecKeyStore())
    new ServerRollupProvider(new URL(process.env.ROLLUP_HOST)), // The interface for communicating with the Aztec Rollup contract.
    wasm, 
);

// The server is now running and forwarding dApp requests (via WalletConnect)
// to the KeyStore, requesting user approval when necessary.
