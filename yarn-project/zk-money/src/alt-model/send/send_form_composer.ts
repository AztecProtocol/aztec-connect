import type { Signer } from '@ethersproject/abstract-signer';
import {
  AztecSdk,
  GrumpkinAddress,
  EthAddress,
  TransferController,
  WithdrawController,
  EthersAdapter,
} from '@aztec/sdk';
import createDebug from 'debug';
import { SendComposerPhase, SendComposerStateObs } from './send_composer_state_obs.js';
import { SendMode } from './send_mode.js';
import { createSigningRetryableGenerator } from '../forms/composer_helpers.js';
import { Amount } from '../assets/index.js';

const debug = createDebug('zm:send_composer');

export type Recipient =
  | {
      sendMode: SendMode.SEND;
      userId: GrumpkinAddress;
    }
  | {
      sendMode: SendMode.WIDTHDRAW;
      address: EthAddress;
    };

export type SendComposerPayload = Readonly<{
  recipient: Recipient;
  targetAmount: Amount;
  feeAmount: Amount;
}>;

interface SendComposerDeps {
  sdk: AztecSdk;
  userId: GrumpkinAddress;
  awaitCorrectSigner: () => Promise<Signer>;
}

export class SendComposer {
  stateObs = new SendComposerStateObs();

  constructor(readonly payload: SendComposerPayload, private readonly deps: SendComposerDeps) {}

  private withRetryableSigning = createSigningRetryableGenerator(this.stateObs);

  async compose() {
    this.stateObs.clearError();
    try {
      const { targetAmount, feeAmount, recipient } = this.payload;
      const { sdk, userId, awaitCorrectSigner } = this.deps;

      this.stateObs.setPhase(SendComposerPhase.GENERATING_KEY);

      const signer = await awaitCorrectSigner();
      const ethersAdapter = new EthersAdapter(signer.provider!);
      const address = await signer.getAddress();

      const { privateKey } = await this.withRetryableSigning(async () => {
        return await sdk.generateSpendingKeyPair(EthAddress.fromString(address), ethersAdapter);
      });
      const schnorrSigner = await sdk.createSchnorrSigner(privateKey);

      this.stateObs.setPhase(SendComposerPhase.CREATING_PROOF);
      let controller: TransferController | WithdrawController;

      if (recipient.sendMode === SendMode.SEND) {
        controller = sdk.createTransferController(
          userId,
          schnorrSigner,
          targetAmount.toAssetValue(),
          feeAmount.toAssetValue(),
          recipient.userId,
          true, // recipientAccountRequired: (transfering to an account that is registered)
        );
      } else {
        controller = sdk.createWithdrawController(
          userId,
          schnorrSigner,
          targetAmount.toAssetValue(),
          feeAmount.toAssetValue(),
          recipient.address,
        );
      }
      await controller.createProof();

      this.stateObs.setPhase(SendComposerPhase.SENDING_PROOF);
      const txId = await controller.send();

      this.stateObs.setPhase(SendComposerPhase.DONE);

      return txId;
    } catch (error) {
      debug('Compose failed with error:', error);
      this.stateObs.error(error?.message?.toString());
      return false;
    }
  }
}
