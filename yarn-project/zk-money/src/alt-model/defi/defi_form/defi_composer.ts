import { GrumpkinAddress, AztecSdk, BridgeCallData, EthersAdapter, EthAddress } from '@aztec/sdk';
import type { Signer } from '@ethersproject/abstract-signer';
import type { Amount } from '../../../alt-model/assets/index.js';
import createDebug from 'debug';
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
  awaitCorrectSigner: () => Promise<Signer>;
  bridgeCallData: BridgeCallData;
}

export class DefiComposer {
  stateObs = new DefiComposerStateObs();
  constructor(readonly payload: DefiComposerPayload, private readonly deps: DefiComposerDeps) {}

  private withRetryableSigning = createSigningRetryableGenerator(this.stateObs);

  async compose() {
    this.stateObs.clearError();
    this.stateObs.setBackNoRetry(false);
    try {
      const { targetDepositAmount, feeAmount } = this.payload;
      const { sdk, userId, awaitCorrectSigner, bridgeCallData } = this.deps;

      this.stateObs.setPhase(DefiComposerPhase.GENERATING_KEY);

      const signer = await awaitCorrectSigner();
      const ethersAdapter = new EthersAdapter(signer.provider!);
      const address = await signer.getAddress();
      const { privateKey } = await this.withRetryableSigning(async () => {
        return await sdk.generateSpendingKeyPair(EthAddress.fromString(address), ethersAdapter);
      });
      const schnorrSigner = await sdk.createSchnorrSigner(privateKey);

      this.stateObs.setPhase(DefiComposerPhase.CREATING_PROOF);
      const controller = sdk.createDefiController(
        userId,
        schnorrSigner,
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
      if (error?.message?.toString() === 'Insufficient fee.') {
        // update obs so user doesn't retry
        this.stateObs.setBackNoRetry(true);
      }
      return false;
    }
  }
}
