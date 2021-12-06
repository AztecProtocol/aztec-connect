import { AssetId } from '@aztec/barretenberg/asset';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { AccountId } from '../user';

/**
 * A join split tx whose output notes belong to the same user.
 * It could be creating a note with certain value for use in a defi deposit tx.
 * Or merging notes to create a larger value note for use in a private send tx.
 */
export class UserUtilTx {
  constructor(
    public readonly txHash: TxHash,
    public readonly userId: AccountId,
    public readonly assetId: AssetId,
    public readonly txFee: bigint,
    public readonly forwardLink: Buffer,
  ) {}
}
