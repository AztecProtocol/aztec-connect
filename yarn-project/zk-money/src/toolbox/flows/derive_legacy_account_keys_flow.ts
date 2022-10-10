import { AztecSdk, EthAddress, EthereumProvider, Web3Signer } from '@aztec/sdk';
import type { Emit, ThrowIfCancelled } from './flows_utils.js';
import { KeyPair } from './types.js';

export type DeriveLegacyAccountKeysFlowState =
  | { phase: 'deriving-signing-message' }
  | { phase: 'awaiting-signature' }
  | { phase: 'deriving-public-key' }
  | { phase: 'done' };

export async function deriveLegacyAccountKeysFlow(
  emitState: Emit<DeriveLegacyAccountKeysFlowState>,
  throwIfCancelled: ThrowIfCancelled,
  sdk: AztecSdk,
  signer: EthereumProvider,
  address: EthAddress,
) {
  emitState({ phase: 'deriving-signing-message' });
  const digest = await sdk.deriveLegacySigningMessageHash(address);

  emitState({ phase: 'awaiting-signature' });
  const web3Signer = new Web3Signer(signer);
  const signature = await throwIfCancelled(web3Signer.signMessage(digest, address));
  const privateKey = signature.slice(0, 32);

  emitState({ phase: 'deriving-public-key' });
  const publicKey = await throwIfCancelled(sdk.derivePublicKey(privateKey));

  emitState({ phase: 'done' });
  const keys: KeyPair = { privateKey, publicKey };
  return keys;
}
