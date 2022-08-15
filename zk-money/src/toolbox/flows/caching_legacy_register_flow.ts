import { registerFlow, RegisterFlowState } from 'toolbox/flows/register_flow';
import {
  deriveLegacyAccountKeysFlow,
  DeriveLegacyAccountKeysFlowState,
} from 'toolbox/flows/derive_legacy_account_keys_flow';
import type { ThrowIfCancelled, Emit } from './flows_utils';
import { CachedStep } from 'app/util';
import { AztecSdk } from '@aztec/sdk';
import { RegistrationKeys } from './types';
import { requestSignerFlow, RequestSignerFlowState } from './request_signer_flow';

export type LegacyAccountRegisterFlowState =
  | { phase: 'await-sdk-sync' }
  | { phase: 'request-signer-for-deriving'; requestSignerFlow: RequestSignerFlowState }
  | { phase: 'derive-legacy-account-keys'; deriveLegacyAccountKeysFlow: DeriveLegacyAccountKeysFlowState }
  | { phase: 'derive-spending-keys' }
  | { phase: 'register'; registerFlow: RegisterFlowState }
  | { phase: 'done' };

export class CachingLegacyAccountRegisterFlow {
  constructor(private readonly sdk: AztecSdk) {}
  private cache = {
    keys: new CachedStep<RegistrationKeys>(),
  };

  clearCache() {
    this.cache.keys.clear();
  }

  async start(emitState: Emit<LegacyAccountRegisterFlowState>, throwIfCancelled: ThrowIfCancelled, alias: string) {
    emitState({ phase: 'await-sdk-sync' });
    const { sdk } = this;
    await throwIfCancelled(sdk.awaitSynchronised());

    const keys = await this.cache.keys.exec(async () => {
      const { signer, address } = await requestSignerFlow(
        requestSignerFlow => emitState({ phase: 'request-signer-for-deriving', requestSignerFlow }),
        throwIfCancelled,
      );
      const accountKeys = await deriveLegacyAccountKeysFlow(
        deriveLegacyAccountKeysFlow => emitState({ phase: 'derive-legacy-account-keys', deriveLegacyAccountKeysFlow }),
        throwIfCancelled,
        sdk,
        signer,
        address,
      );
      if (await sdk.isAccountRegistered(accountKeys.publicKey)) throw new Error('Account already registered');
      emitState({ phase: 'derive-spending-keys' });
      const spendingKeys = await throwIfCancelled(sdk.generateSpendingKeyPair(address, signer));
      return { accountKeys, spendingKeys };
    });
    await registerFlow(
      registerFlow => emitState({ phase: 'register', registerFlow }),
      throwIfCancelled,
      sdk,
      keys.accountKeys,
      alias,
      keys.spendingKeys.publicKey,
    );
    emitState({ phase: 'done' });
  }
}
