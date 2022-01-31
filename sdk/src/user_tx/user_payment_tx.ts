import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';

export class UserPaymentTx {
  constructor(
    public readonly txId: TxId,
    public readonly userId: AccountId,
    public readonly proofId: ProofId.DEPOSIT | ProofId.WITHDRAW | ProofId.SEND,
    public readonly value: AssetValue,
    public readonly fee: AssetValue,
    public readonly publicOwner: EthAddress | undefined,
    public readonly isSender: boolean,
    public readonly created: Date,
    public readonly settled?: Date,
  ) {}
}
