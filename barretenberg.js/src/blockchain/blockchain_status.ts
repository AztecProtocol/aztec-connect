import { EthAddress } from '../address';

export interface BlockchainAsset {
  address: EthAddress;
  permitSupport: boolean;
  decimals: number;
  symbol: string;
}

export interface BlockchainStatus {
  chainId: number;
  networkOrHost: string;
  rollupContractAddress: EthAddress;
  feeDistributorContractAddress: EthAddress;
  nextRollupId: number;
  dataSize: number;
  dataRoot: Buffer;
  nullRoot: Buffer;
  rootRoot: Buffer;
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
  networkOrHost: string;
  rollupContractAddress: string;
  feeDistributorContractAddress: string;
  nextRollupId: number;
  dataSize: number;
  dataRoot: string;
  nullRoot: string;
  rootRoot: string;
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
  }[];
}

export function blockchainStatusToJson(status: BlockchainStatus): BlockchainStatusJson {
  return {
    ...status,
    rollupContractAddress: status.rollupContractAddress.toString(),
    feeDistributorContractAddress: status.feeDistributorContractAddress.toString(),
    dataRoot: status.dataRoot.toString('hex'),
    nullRoot: status.nullRoot.toString('hex'),
    rootRoot: status.rootRoot.toString('hex'),
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

export function blockchainStatusFromJson(json: BlockchainStatusJson) {
  return {
    ...json,
    rollupContractAddress: EthAddress.fromString(json.rollupContractAddress),
    feeDistributorContractAddress: EthAddress.fromString(json.feeDistributorContractAddress),
    dataRoot: Buffer.from(json.dataRoot, 'hex'),
    nullRoot: Buffer.from(json.nullRoot, 'hex'),
    rootRoot: Buffer.from(json.rootRoot, 'hex'),
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
