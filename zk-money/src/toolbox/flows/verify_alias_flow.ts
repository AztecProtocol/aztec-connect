import { AztecSdk, GrumpkinAddress } from '@aztec/sdk';
import { formatAliasInput, isValidAliasInput } from 'app';
import { Fullfiller } from 'app/util';
import { Emit, ThrowIfCancelled } from './flows_utils';

export type AliasCheckResult = 'invalid' | 'matches' | 'not-found' | 'different-account';
type CheckAlias = (alias: string) => Promise<AliasCheckResult>;

export interface VerifyAliasFlowState {
  checkAlias: CheckAlias;
  next: () => void;
}

export async function verifyAliasFlow(
  emitState: Emit<VerifyAliasFlowState>,
  throwIfCancelled: ThrowIfCancelled,
  sdk: AztecSdk,
  userId: GrumpkinAddress,
) {
  // It's the component accepting keystrokes that's responsible for settling on the final input so as to avoid rapid
  // input related race conditions. Therefore validator should be available to the component.
  const checkAlias: CheckAlias = async alias => {
    const formattedAlias = formatAliasInput(alias);
    if (!isValidAliasInput(alias)) return 'invalid';
    const aliasOwnerUserId = await sdk.getAccountPublicKey(formattedAlias);
    if (!aliasOwnerUserId) return 'not-found';
    if (aliasOwnerUserId.equals(userId)) return 'matches';
    return 'different-account';
  };
  const userReadyFullfiller = new Fullfiller<void>();
  emitState({ checkAlias, next: userReadyFullfiller.resolve });

  await throwIfCancelled(userReadyFullfiller.promise);
}
