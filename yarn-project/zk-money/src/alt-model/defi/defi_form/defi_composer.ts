import type { GrumpkinAddress, AztecSdk, BridgeCallData } from '@aztec/sdk';
import type { Provider } from '../../../app/index.js';
import type { Amount } from '../../../alt-model/assets/index.js';
import createDebug from 'debug';
import { createSigningKeys } from '../../../app/key_vault.js';
import { DefiComposerPhase, DefiComposerStateObs } from './defi_composer_state_obs.js';
import { createSigningRetryableGenerator } from '../../../alt-model/forms/composer_helpers.js';

const debug = createDebug('zm:defi_composer');

export type DefiComposerPayload = Readonly<{
  targetDepositAmount: Amount;
  feeAmount: Amount;
}>;

export interface DefiComposerDeps {
  sdk: AztecSdk;
  userId: GrumpkinAddress;
  awaitCorrectProvider: () => Promise<Provider>;
  bridgeCallData: BridgeCallData;
}

export class DefiComposer {
  stateObs = new DefiComposerStateObs();
  constructor(readonly payload: DefiComposerPayload, private readonly deps: DefiComposerDeps) {}

  private withRetryableSigning = createSigningRetryableGenerator(this.stateObs);

  async compose() {
    this.stateObs.clearError();
    try {
      const { targetDepositAmount, feeAmount } = this.payload;
      const { sdk, userId, awaitCorrectProvider, bridgeCallData } = this.deps;

      this.stateObs.setPhase(DefiComposerPhase.GENERATING_KEY);
      const provider = await awaitCorrectProvider();
      const { privateKey } = await this.withRetryableSigning(() => createSigningKeys(provider, sdk));
      const signer = await sdk.createSchnorrSigner(privateKey);

      this.stateObs.setPhase(DefiComposerPhase.CREATING_PROOF);
      const controller = sdk.createDefiController(
        userId,
        signer,
        bridgeCallData,
        targetDepositAmount.toAssetValue(),
        feeAmount.toAssetValue(),
      );
      await controller.createProof();
      this.stateObs.setPhase(DefiComposerPhase.SENDING_PROOF);

      const txId = await controller.send();
      this.stateObs.setPhase(DefiComposerPhase.DONE);

      return txId;
    } catch (error) {
      debug('Compose failed with error:', error);
      this.stateObs.error(error?.message?.toString());
      return false;
    }
  }
}
