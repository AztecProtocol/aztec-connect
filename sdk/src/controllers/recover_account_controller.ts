import { AssetValue } from '@aztec/barretenberg/asset';
import { CoreSdkInterface } from '../core_sdk';
import { RecoverSignatureSigner } from '../signer';
import { RecoveryPayload } from '../user';
import { AddSigningKeyController } from './add_signing_key_controller';

export class RecoverAccountController {
  private addSigningKeyController: AddSigningKeyController;

  constructor(public readonly recoveryPayload: RecoveryPayload, public readonly fee: AssetValue, core: CoreSdkInterface) {
    const {
      trustedThirdPartyPublicKey,
      recoveryPublicKey,
      recoveryData: { accountId, signature },
    } = recoveryPayload;
    const recoverySigner = new RecoverSignatureSigner(recoveryPublicKey, signature);
    this.addSigningKeyController = new AddSigningKeyController(
      accountId,
      recoverySigner,
      trustedThirdPartyPublicKey,
      undefined,
      fee,
      core,
    );
  }

  public async createProof() {
    await this.addSigningKeyController.createProof();
  }

  async send() {
    return this.addSigningKeyController.send();
  }

  async awaitSettlement(timeout?: number) {
    await this.addSigningKeyController.awaitSettlement(timeout);
  }
}
