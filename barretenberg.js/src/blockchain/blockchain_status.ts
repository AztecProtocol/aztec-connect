import { EthAddress } from '../address';

export enum TxType {
  DEPOSIT,
  TRANSFER,
  WITHDRAW_TO_WALLET,
  WITHDRAW_TO_CONTRACT,
  ACCOUNT,
  DEFI_DEPOSIT,
  DEFI_CLAIM,
}

export interface BlockchainAsset {
  address: EthAddress;
  permitSupport: boolean;
  decimals: number;
  symbol: string;
  name: string;
  gasConstants: number[];
}

export interface BlockchainStatus {
  chainId: number;
  rollupContractAddress: EthAddress;
  feeDistributorContractAddress: EthAddress;
  verifierContractAddress: EthAddress;
  nextRollupId: number;
  dataSize: number;
  dataRoot: Buffer;
  nullRoot: Buffer;
  rootRoot: Buffer;
  defiRoot: Buffer;
  defiInteractionHash: Buffer;
  escapeOpen: boolean;
  numEscapeBlocksRemaining: number;
  totalDeposited: bigint[];
  totalWithdrawn: bigint[];
  totalPendingDeposit: bigint[];
  totalFees: bigint[];
  feeDistributorBalance: bigint[];
  assets: BlockchainAsset[];
}

export interface BlockchainStatusJson {
  chainId: number;
  rollupContractAddress: string;
  feeDistributorContractAddress: string;
  verifierContractAddress: string;
  nextRollupId: number;
  dataSize: number;
  dataRoot: string;
  nullRoot: string;
  rootRoot: string;
  defiRoot: string;
  defiInteractionHash: string;
  escapeOpen: boolean;
  numEscapeBlocksRemaining: number;
  totalDeposited: string[];
  totalWithdrawn: string[];
  totalPendingDeposit: string[];
  totalFees: string[];
  feeDistributorBalance: string[];
  assets: {
    address: string;
    permitSupport: boolean;
    decimals: number;
    symbol: string;
    name: string;
    gasConstants: number[];
  }[];
}

export function blockchainStatusToJson(status: BlockchainStatus): BlockchainStatusJson {
  return {
    ...status,
    rollupContractAddress: status.rollupContractAddress.toString(),
    feeDistributorContractAddress: status.feeDistributorContractAddress.toString(),
    verifierContractAddress: status.verifierContractAddress.toString(),
    dataRoot: status.dataRoot.toString('hex'),
    nullRoot: status.nullRoot.toString('hex'),
    rootRoot: status.rootRoot.toString('hex'),
    defiRoot: status.defiRoot.toString('hex'),
    defiInteractionHash: status.defiInteractionHash.toString('hex'),
    totalDeposited: status.totalDeposited.map(f => f.toString()),
    totalWithdrawn: status.totalWithdrawn.map(f => f.toString()),
    totalPendingDeposit: status.totalPendingDeposit.map(f => f.toString()),
    totalFees: status.totalFees.map(f => f.toString()),
    feeDistributorBalance: status.feeDistributorBalance.map(f => f.toString()),
    assets: status.assets.map(a => ({
      ...a,
      address: a.address.toString(),
    })),
  };
}

export function blockchainStatusFromJson(json: BlockchainStatusJson): BlockchainStatus {
  return {
    ...json,
    rollupContractAddress: EthAddress.fromString(json.rollupContractAddress),
    feeDistributorContractAddress: EthAddress.fromString(json.feeDistributorContractAddress),
    verifierContractAddress: EthAddress.fromString(json.feeDistributorContractAddress),
    dataRoot: Buffer.from(json.dataRoot, 'hex'),
    nullRoot: Buffer.from(json.nullRoot, 'hex'),
    rootRoot: Buffer.from(json.rootRoot, 'hex'),
    defiRoot: Buffer.from(json.defiRoot, 'hex'),
    defiInteractionHash: Buffer.from(json.defiInteractionHash, 'hex'),
    totalDeposited: json.totalDeposited.map(f => BigInt(f)),
    totalWithdrawn: json.totalWithdrawn.map(f => BigInt(f)),
    totalPendingDeposit: json.totalPendingDeposit.map(f => BigInt(f)),
    totalFees: json.totalFees.map(f => BigInt(f)),
    feeDistributorBalance: json.feeDistributorBalance.map(f => BigInt(f)),
    assets: json.assets.map(a => ({
      ...a,
      address: EthAddress.fromString(a.address),
    })),
  };
}

export interface BlockchainStatusSource {
  getBlockchainStatus(): Promise<BlockchainStatus>;
}
