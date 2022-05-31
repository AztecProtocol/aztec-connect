import { AztecSdk, GrumpkinAddress, EthAddress, TransferController, WithdrawController } from '@aztec/sdk';
import { Amount } from 'alt-model/assets';
import { createSigningKeys } from 'app/key_vault';
import createDebug from 'debug';
import { Provider } from 'app/provider';
import { SendComposerPhase, SendComposerStateObs } from './send_composer_state_obs';
import { SendMode } from './send_mode';

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

export interface SendComposerDeps {
  sdk: AztecSdk;
  userId: GrumpkinAddress;
  awaitCorrectProvider: () => Promise<Provider>;
}

export class SendComposer {
  stateObs = new SendComposerStateObs();

  constructor(readonly payload: SendComposerPayload, private readonly deps: SendComposerDeps) {}

  async compose() {
    this.stateObs.clearError();
    try {
      const { targetAmount, feeAmount, recipient } = this.payload;
      const { sdk, userId, awaitCorrectProvider } = this.deps;

      this.stateObs.setPhase(SendComposerPhase.GENERATING_KEY);
      const provider = await awaitCorrectProvider();
      const { privateKey } = await createSigningKeys(provider, sdk);
      const signer = await sdk.createSchnorrSigner(privateKey);

      this.stateObs.setPhase(SendComposerPhase.CREATING_PROOF);
      let controller: TransferController | WithdrawController;

      if (recipient.sendMode === SendMode.SEND) {
        controller = sdk.createTransferController(
          userId,
          signer,
          targetAmount.toAssetValue(),
          feeAmount.toAssetValue(),
          recipient.userId,
        );
      } else {
        controller = sdk.createWithdrawController(
          userId,
          signer,
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
