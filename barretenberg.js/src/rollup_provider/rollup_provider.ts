import { EthAddress, GrumpkinAddress } from '../address';
import { AssetValue } from '../asset';
import { BlockSource } from '../block_source';
import { BridgeId } from '../bridge_id';
import { TxId } from '../tx_id';
import { RollupProviderStatus } from './rollup_provider_status';

export enum TxSettlementTime {
  NEXT_ROLLUP,
  INSTANT,
}

export enum DefiSettlementTime {
  DEADLINE,
  NEXT_ROLLUP,
  INSTANT,
}

export interface Tx {
  proofData: Buffer;
  offchainTxData: Buffer;
  depositSignature?: Buffer;
}

export interface TxJson {
  proofData: string;
  offchainTxData: string;
  depositSignature?: string;
}

export const txToJson = ({ proofData, offchainTxData, depositSignature }: Tx): TxJson => ({
  proofData: proofData.toString('hex'),
  offchainTxData: offchainTxData.toString('hex'),
  depositSignature: depositSignature ? depositSignature.toString('hex') : undefined,
});

export const txFromJson = ({ proofData, offchainTxData, depositSignature }: TxJson): Tx => ({
  proofData: Buffer.from(proofData, 'hex'),
  offchainTxData: Buffer.from(offchainTxData, 'hex'),
  depositSignature: depositSignature ? Buffer.from(depositSignature, 'hex') : undefined,
});

export interface PendingTx {
  txId: TxId;
  noteCommitment1: Buffer;
  noteCommitment2: Buffer;
}

export interface PendingTxJson {
  txId: string;
  noteCommitment1: string;
  noteCommitment2: string;
}

export const pendingTxToJson = ({ txId, noteCommitment1, noteCommitment2 }: PendingTx): PendingTxJson => ({
  txId: txId.toString(),
  noteCommitment1: noteCommitment1.toString('hex'),
  noteCommitment2: noteCommitment2.toString('hex'),
});

export const pendingTxFromJson = ({ txId, noteCommitment1, noteCommitment2 }: PendingTxJson): PendingTx => ({
  txId: TxId.fromString(txId),
  noteCommitment1: Buffer.from(noteCommitment1, 'hex'),
  noteCommitment2: Buffer.from(noteCommitment2, 'hex'),
});

export interface InitialWorldState {
  initialAccounts: Buffer;
  initialSubtreeRoots: Buffer[];
}

export const initialWorldStateToBuffer = (initialWorldState: InitialWorldState): Buffer => {
  const accountsSizeBuf = Buffer.alloc(4);
  accountsSizeBuf.writeUInt32BE(initialWorldState.initialAccounts.length);
  return Buffer.concat([accountsSizeBuf, initialWorldState.initialAccounts, ...initialWorldState.initialSubtreeRoots]);
};

export const initialWorldStateFromBuffer = (data: Buffer): InitialWorldState => {
  const accountsSize = data.readUInt32BE(0);
  const subTreeStart = 4 + accountsSize;
  const initialWorldState = {
    initialAccounts: data.slice(4, subTreeStart),
    initialSubtreeRoots: [],
  } as InitialWorldState;
  // each sub tree root is 32 bytes
  for (let i = subTreeStart; i < data.length; i += 32) {
    initialWorldState.initialSubtreeRoots.push(data.slice(i, i + 32));
  }
  return initialWorldState;
};
export interface DepositTx {
  assetId: number;
  value: bigint;
  publicOwner: EthAddress;
}

export interface DepositTxJson {
  assetId: number;
  value: string;
  publicOwner: string;
}

export const depositTxToJson = ({ assetId, value, publicOwner }: DepositTx): DepositTxJson => ({
  assetId,
  value: value.toString(),
  publicOwner: publicOwner.toString(),
});

export const depositTxFromJson = ({ assetId, value, publicOwner }: DepositTxJson): DepositTx => ({
  assetId,
  value: BigInt(value),
  publicOwner: EthAddress.fromString(publicOwner),
});

export interface InitialWorldState {
  initialAccounts: Buffer;
}

export interface RollupProvider extends BlockSource {
  sendTxs(txs: Tx[]): Promise<TxId[]>;
  getStatus(): Promise<RollupProviderStatus>;
  getTxFees(assetId: number): Promise<AssetValue[][]>;
  getDefiFees(bridgeId: BridgeId): Promise<AssetValue[]>;
  getPendingTxs(): Promise<PendingTx[]>;
  getPendingNoteNullifiers(): Promise<Buffer[]>;
  getPendingDepositTxs(): Promise<DepositTx[]>;
  clientLog(msg: any): Promise<void>;
  getInitialWorldState(): Promise<InitialWorldState>;
  isAccountRegistered(accountPublicKey: GrumpkinAddress): Promise<boolean>;
  isAliasRegistered(alias: string): Promise<boolean>;
  isAliasRegisteredToAccount(accountPublicKey: GrumpkinAddress, alias: string): Promise<boolean>;
}
