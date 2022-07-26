import type { AztecSdk } from '@aztec/sdk';
import { CachedStep } from 'app/util';
import { Emit, ThrowIfCancelled } from './flows_utils';
import { legacyMigrateFlow, LegacyMigrateFlowState } from './legacy_migrate_flow';
import { requestSignerFlow, RequestSignerFlowState } from './request_signer_flow';
import { deriveLegacyAccountKeysFlow, DeriveLegacyAccountKeysFlowState } from './derive_legacy_account_keys_flow';
import { KeyPair, RegistrationKeys } from './types';
import { verifyAliasFlow, VerifyAliasFlowState } from './verify_alias_flow';

export type RecoverAliasFlowState =
  | { phase: 'await-sdk-sync' }
  | { phase: 'request-legacy-keys-signer'; requestSignerFlow: RequestSignerFlowState }
  | { phase: 'derive-legacy-keys'; deriveLegacyAccountKeysFlow: DeriveLegacyAccountKeysFlowState }
  | { phase: 'checking-legacy-keys' }
  | { phase: 'verify-alias'; verifyAliasFlow: VerifyAliasFlowState }
  | { phase: 'request-new-keys-signer'; requestSignerFlow: RequestSignerFlowState }
  | { phase: 'derive-new-account-keys' }
  | { phase: 'checking-new-account-keys' }
  | { phase: 'derive-new-spending-keys' }
  | { phase: 'migrate'; legacyMigrateFlow: LegacyMigrateFlowState }
  | { phase: 'done' };

export class CachingRecoverAliasFlow {
  constructor(private readonly sdk: AztecSdk) {}

  private cache = {
    legacyAccountKeys: new CachedStep<KeyPair>(),
    newKeys: new CachedStep<RegistrationKeys>(),
  };

  clearCache() {
    this.cache.legacyAccountKeys.clear();
    this.cache.newKeys.clear();
  }

  async start(emitState: Emit<RecoverAliasFlowState>, throwIfCancelled: ThrowIfCancelled) {
    emitState({ phase: 'await-sdk-sync' });
    const { sdk } = this;
    await sdk.awaitSynchronised();

    const legacyKeys = await this.cache.legacyAccountKeys.exec(async () => {
      const { signer, address } = await requestSignerFlow(
        requestSignerFlow => emitState({ phase: 'request-legacy-keys-signer', requestSignerFlow }),
        throwIfCancelled,
      );
      const keys = await deriveLegacyAccountKeysFlow(
        deriveLegacyAccountKeysFlow => emitState({ phase: 'derive-legacy-keys', deriveLegacyAccountKeysFlow }),
        throwIfCancelled,
        sdk,
        signer,
        address,
      );
      emitState({ phase: 'checking-legacy-keys' });
      const isRegistered = await throwIfCancelled(sdk.isAccountRegistered(keys.publicKey));
      if (!isRegistered) throw new Error('No old zk.money account found at this address');
      await verifyAliasFlow(
        verifyAliasFlow => emitState({ phase: 'verify-alias', verifyAliasFlow }),
        throwIfCancelled,
        sdk,
        keys.publicKey,
      );
      return keys;
    });

    const newKeys = await this.cache.newKeys.exec(async () => {
      const { signer, address } = await requestSignerFlow(
        requestSignerFlow => emitState({ phase: 'request-new-keys-signer', requestSignerFlow }),
        throwIfCancelled,
      );
      emitState({ phase: 'derive-new-account-keys' });
      const accountKeys = await sdk.generateAccountKeyPair(address, signer);
      emitState({ phase: 'checking-new-account-keys' });
      const isRegistered = await throwIfCancelled(sdk.isAccountRegistered(accountKeys.publicKey));
      if (isRegistered) throw new Error('An account already exists at this address');
      emitState({ phase: 'derive-new-spending-keys' });
      const spendingKeys = await sdk.generateSpendingKeyPair(address, signer);
      return { accountKeys, spendingKeys };
    });

    await legacyMigrateFlow(
      legacyMigrateFlow => emitState({ phase: 'migrate', legacyMigrateFlow }),
      throwIfCancelled,
      sdk,
      legacyKeys,
      newKeys.accountKeys,
      newKeys.spendingKeys.publicKey,
    );
    emitState({ phase: 'done' });
  }
}
