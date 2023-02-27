import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';

export class CoreDefiTx {
  public readonly proofId = ProofId.DEFI_DEPOSIT;

  constructor(
    public readonly txId: TxId,
    public readonly userId: GrumpkinAddress,
    public readonly bridgeCallData: BridgeCallData,
    public readonly depositValue: bigint,
    public readonly txFee: bigint,
    public readonly txRefNo: number,
    public readonly created: Date,
    public readonly partialState: Buffer,
    public readonly partialStateSecret: Buffer,
    // Optional because not known at the time of proof construction.
    public nullifier?: Buffer,
    public settled?: Date,
    public interactionNonce?: number,
    public isAsync?: boolean,
    // Optional because filled in once interaction finalised.
    public success?: boolean,
    public outputValueA?: bigint,
    public outputValueB?: bigint,
    public finalised?: Date,
    // Optional becaused filled in once claimed.
    public claimSettled?: Date,
    public claimTxId?: TxId,
  ) {}
}

export interface CoreDefiTxJson {
  proofId: number;
  txId: string;
  userId: string;
  bridgeCallData: string;
  depositValue: string;
  txFee: string;
  txRefNo: number;
  created: Date;
  partialState: string;
  partialStateSecret: string;
  nullifier?: string;
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
  bridgeCallData: tx.bridgeCallData.toString(),
  depositValue: tx.depositValue.toString(),
  txFee: tx.txFee.toString(),
  partialState: tx.partialState.toString('hex'),
  partialStateSecret: tx.partialStateSecret.toString('hex'),
  nullifier: tx.nullifier?.toString('hex'),
  outputValueA: tx.outputValueA?.toString(),
  outputValueB: tx.outputValueB?.toString(),
  claimTxId: tx.claimTxId?.toString(),
});

export const coreDefiTxFromJson = (json: CoreDefiTxJson) =>
  new CoreDefiTx(
    TxId.fromString(json.txId),
    GrumpkinAddress.fromString(json.userId),
    BridgeCallData.fromString(json.bridgeCallData),
    BigInt(json.depositValue),
    BigInt(json.txFee),
    json.txRefNo,
    json.created,
    Buffer.from(json.partialState, 'hex'),
    Buffer.from(json.partialStateSecret, 'hex'),
    json.nullifier ? Buffer.from(json.nullifier, 'hex') : undefined,
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
