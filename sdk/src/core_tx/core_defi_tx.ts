import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';

export class CoreDefiTx {
  public readonly proofId = ProofId.DEFI_DEPOSIT;

  constructor(
    public readonly txId: TxId,
    public readonly userId: GrumpkinAddress,
    public readonly bridgeId: BridgeId,
    public readonly depositValue: bigint,
    public readonly txFee: bigint,
    public readonly partialStateSecret: Buffer,
    public readonly txRefNo: number,
    public readonly created: Date,
    public readonly settled?: Date,
    public readonly interactionNonce?: number,
    public readonly isAsync?: boolean,
    public readonly success?: boolean,
    public readonly outputValueA?: bigint,
    public readonly outputValueB?: bigint,
    public readonly finalised?: Date,
    public readonly claimSettled?: Date,
    public readonly claimTxId?: TxId,
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
  interactionNonce?: number;
  isAsync?: boolean;
  success?: boolean;
  outputValueA?: string;
  outputValueB?: string;
  finalised?: Date;
  claimSettled?: Date;
  claimTxId?: string;
}

export const coreDefiTxToJson = (tx: CoreDefiTx): CoreDefiTxJson => ({
  ...tx,
  txId: tx.txId.toString(),
  userId: tx.userId.toString(),
  bridgeId: tx.bridgeId.toString(),
  depositValue: tx.depositValue.toString(),
  txFee: tx.txFee.toString(),
  partialStateSecret: tx.partialStateSecret.toString('hex'),
  outputValueA: tx.outputValueA?.toString(),
  outputValueB: tx.outputValueB?.toString(),
  claimTxId: tx.claimTxId?.toString(),
});

export const coreDefiTxFromJson = (json: CoreDefiTxJson) =>
  new CoreDefiTx(
    TxId.fromString(json.txId),
    GrumpkinAddress.fromString(json.userId),
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
    json.outputValueA ? BigInt(json.outputValueA) : undefined,
    json.outputValueB ? BigInt(json.outputValueB) : undefined,
    json.finalised,
    json.claimSettled,
    json.claimTxId ? TxId.fromString(json.claimTxId) : undefined,
  );
