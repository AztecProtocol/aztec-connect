import { CoreAccountTx, CoreClaimTx, CoreDefiTx, CorePaymentTx } from '../core_tx/index.js';
import { SpendingKey } from '../database/index.js';
import { Note } from '../note/index.js';

export class ProcessedTxData {
  constructor(
    public readonly tx: CorePaymentTx | CoreAccountTx | CoreDefiTx,
    public readonly data?: {
      nullifiers?: Buffer[];
      outputNotes?: Note[];
      spendingKeys?: SpendingKey[];
      claimTx?: CoreClaimTx;
    },
  ) {}

  get nullifiers() {
    return this.data?.nullifiers || [];
  }

  get outputNotes() {
    return this.data?.outputNotes || [];
  }

  get spendingKeys() {
    return this.data?.spendingKeys || [];
  }

  get claimTx() {
    return this.data?.claimTx;
  }
}
