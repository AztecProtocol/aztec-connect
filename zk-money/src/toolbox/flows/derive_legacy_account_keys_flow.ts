import { AztecSdk, EthAddress, EthereumProvider, Web3Signer } from '@aztec/sdk';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { Blake2s } from '@aztec/barretenberg/crypto';
import { utils } from 'ethers';
import type { Emit, ThrowIfCancelled } from './flows_utils';
import { KeyPair } from './types';

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
  const barretenberg = await throwIfCancelled(BarretenbergWasm.new());
  const blake2s = new Blake2s(barretenberg);
  const signingMessage = blake2s.hashToField(address.toBuffer());
  const msgHash = utils.keccak256(signingMessage);
  const digest = Buffer.from(utils.arrayify(msgHash));

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
