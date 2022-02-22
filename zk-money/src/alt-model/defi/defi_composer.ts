import createDebug from 'debug';
import { AccountId, DefiSettlementTime, AztecSdk, BridgeId } from '@aztec/sdk';
import { Provider } from '../../app';
import { createSigningKeys } from '../../app/key_vault';
import { Obs } from '../../app/util/obs';

const debug = createDebug('zm:defi_composer');

export interface DefiComposerPayload {
  amount: bigint;
  speed: DefiSettlementTime;
}

export interface DefiComposerDeps {
  sdk: AztecSdk;
  accountId: AccountId;
  awaitCorrectProvider: () => Promise<Provider>;
}

export enum DefiComposerPhase {
  IDLE,
  GENERATING_KEY = 'GENERATING_KEY',
  CREATING_PROOF = 'CREATING_PROOF',
  SENDING_PROOF = 'SENDING_PROOF',
  DONE = 'DONE',
}
export interface DefiComposerState {
  phase: DefiComposerPhase;
  erroredPhase?: DefiComposerPhase;
}

export class DefiComposer {
  stateObs = new Obs<DefiComposerState>({ phase: DefiComposerPhase.IDLE });
  constructor(readonly bridgeId: BridgeId) {}

  async compose(payload: DefiComposerPayload, deps: DefiComposerDeps) {
    try {
      this.stateObs.next({ phase: DefiComposerPhase.GENERATING_KEY });

      const provider = await deps.awaitCorrectProvider();
      const { privateKey } = await createSigningKeys(provider, deps.sdk);
      const signer = await deps.sdk.createSchnorrSigner(privateKey);

      this.stateObs.next({ phase: DefiComposerPhase.CREATING_PROOF });
      const fees = await deps.sdk.getDefiFees(this.bridgeId);
      const fee = fees[payload.speed];
      const controller = deps.sdk.createDefiController(
        deps.accountId,
        signer,
        this.bridgeId,
        { assetId: this.bridgeId.inputAssetIdA, value: payload.amount },
        fee,
      );
      await controller.createProof();
      this.stateObs.next({ phase: DefiComposerPhase.SENDING_PROOF });
      await controller.send();
      this.stateObs.next({ phase: DefiComposerPhase.DONE });
    } catch (error) {
      debug('Compose failed with error:', error);
      this.stateObs.next({ phase: DefiComposerPhase.IDLE, erroredPhase: this.stateObs.value.phase });
    }
  }
}
