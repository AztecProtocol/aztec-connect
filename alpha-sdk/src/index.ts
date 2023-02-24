import { CoreSdk } from './core_sdk/index.js';
export { SDK_VERSION } from './version.js';
export * from './aztec_sdk/index.js';
export * from './aztec_wallet_provider/index.js';
export * from './key_store/index.js';
export * from './controllers/index.js';
export { SdkEvent, SdkStatus } from './core_sdk/index.js';
export * from './note/index.js';
export * from './recovery_payload/index.js';
export * from './signer/index.js';
export * from './user_tx/index.js';
export * from '@aztec/barretenberg/account_id';
export * from '@aztec/barretenberg/address';
export * from '@aztec/barretenberg/asset';
export * from '@aztec/barretenberg/bigint_buffer';
export * from '@aztec/barretenberg/bridge_call_data';
export { ProofId } from '@aztec/barretenberg/client_proofs';
export * from '@aztec/barretenberg/crypto';
export * from '@aztec/barretenberg/rollup_provider';
export * from '@aztec/barretenberg/rollup_proof';
export * from '@aztec/barretenberg/fifo';
export * from '@aztec/barretenberg/tx_id';
export * from '@aztec/barretenberg/blockchain';
export { EthereumProvider, EthereumRpc } from '@aztec/barretenberg/blockchain';
export { SchnorrSignature, Schnorr, randomBytes } from '@aztec/barretenberg/crypto';
export { GrumpkinAddress, EthAddress } from '@aztec/barretenberg/address';
export { Grumpkin } from '@aztec/barretenberg/ecc';
export { getRollupProviderStatus, ServerRollupProvider } from '@aztec/barretenberg/rollup_provider';
export * from '@aztec/barretenberg/timer';
export * from '@aztec/barretenberg/log';
export { enableLogs, isLogEnabled } from '@aztec/barretenberg/log';
export * from '@aztec/barretenberg/offchain_tx_data';

export type AztecBuffer = Buffer;
export const AztecBuffer = Buffer;

export {
  JsonRpcProvider,
  WalletProvider,
  EthersAdapter,
  Web3Adapter,
  Web3Provider,
  Web3Signer,
  toBaseUnits,
  fromBaseUnits,
  FeeDistributor,
  RollupProcessor,
  EthAsset,
} from '@aztec/blockchain';

// Exposing for medici. Remove once they have proper multisig api.
export * from './proofs/index.js';
export { BarretenbergWasm } from '@aztec/barretenberg/wasm';
export * from './iframe_aztec_wallet_provider/client/index.js';
export * from './iframe_aztec_wallet_provider/server/index.js';
export * from './eip1193_aztec_wallet_provider/index.js';
export { EIP1193AztecWalletProviderClient as AztecWalletProviderClient } from './eip1193_aztec_wallet_provider/index.js';
export type CoreSdkInterface = {
  [K in keyof CoreSdk]: CoreSdk[K];
};
