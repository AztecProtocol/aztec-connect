import type { Emit, ThrowIfCancelled } from './flows_utils';
import { Signer } from '@ethersproject/abstract-signer';
import { Fullfiller } from 'app/util';
import { EthAddress, EthersAdapter } from '@aztec/sdk';

type SignerResolver = (signer: Signer) => void;

export interface RequestSignerFlowState {
  resolveSigner: SignerResolver;
}

export async function requestSignerFlow(emitState: Emit<RequestSignerFlowState>, throwIfCancelled: ThrowIfCancelled) {
  const signerFullfiller = new Fullfiller<Signer>();
  emitState({ resolveSigner: signerFullfiller.resolve });
  const signer = await throwIfCancelled(signerFullfiller.promise);
  const address = EthAddress.fromString(await signer.getAddress());
  return { signer: new EthersAdapter(signer.provider!), address };
}
