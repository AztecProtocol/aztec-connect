import { AccountId } from '@aztec/barretenberg/account_id';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';

export class CoreDefiTx {
  public readonly proofId = ProofId.DEFI_DEPOSIT;

  constructor(
    public readonly txId: TxId,
    public readonly userId: AccountId,
    public readonly bridgeId: BridgeId,
    public readonly depositValue: bigint,
    public readonly txFee: bigint,
    public readonly partialStateSecret: Buffer,
    public readonly txRefNo: number,
    public readonly created: Date,
    public readonly settled?: Date,
    public readonly interactionNonce = 0,
    public readonly isAsync = false,
    public readonly success = false,
    public readonly outputValueA = BigInt(0),
    public readonly outputValueB = BigInt(0),
    public readonly finalised?: Date,
    public readonly claimSettled?: Date,
  ) {}
}

export interface CoreDefiTxJson {
  proofId: number;
  txId: string;
  userId: string;
  bridgeId: string;
  depositValue: string;
  txFee: string;
  partialStateSecret: string;
  txRefNo: number;
  created: Date;
  settled?: Date;
  interactionNonce: number;
  isAsync: boolean;
  success: boolean;
  outputValueA: string;
  outputValueB: string;
  finalised?: Date;
  claimSettled?: Date;
}

export const coreDefiTxToJson = (tx: CoreDefiTx): CoreDefiTxJson => ({
  ...tx,
  txId: tx.txId.toString(),
  userId: tx.userId.toString(),
  bridgeId: tx.bridgeId.toString(),
  depositValue: tx.depositValue.toString(),
  txFee: tx.txFee.toString(),
  partialStateSecret: tx.partialStateSecret.toString('hex'),
  outputValueA: tx.outputValueA.toString(),
  outputValueB: tx.outputValueB.toString(),
});

export const coreDefiTxFromJson = (json: CoreDefiTxJson) =>
  new CoreDefiTx(
    TxId.fromString(json.txId),
    AccountId.fromString(json.userId),
    BridgeId.fromString(json.bridgeId),
    BigInt(json.depositValue),
    BigInt(json.txFee),
    Buffer.from(json.partialStateSecret, 'hex'),
    json.txRefNo,
    json.created,
    json.settled,
    json.interactionNonce,
    json.isAsync,
    json.success,
    BigInt(json.outputValueA),
    BigInt(json.outputValueB),
    json.finalised,
    json.claimSettled,
  );
