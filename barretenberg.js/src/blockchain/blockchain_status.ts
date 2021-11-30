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

export function isDefiDeposit(txType: TxType) {
  return txType === TxType.DEFI_DEPOSIT;
}

export function isAccountCreation(txType: TxType) {
  return txType === TxType.ACCOUNT;
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
  defiInteractionHashes: Buffer[];
  escapeOpen: boolean;
  numEscapeBlocksRemaining: number;
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
  defiInteractionHashes: string[];
  escapeOpen: boolean;
  numEscapeBlocksRemaining: number;
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
    defiInteractionHashes: status.defiInteractionHashes.map(v => v.toString('hex')),
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
    defiInteractionHashes: json.defiInteractionHashes.map(f => Buffer.from(f, 'hex')),
    assets: json.assets.map(a => ({
      ...a,
      address: EthAddress.fromString(a.address),
    })),
  };
}

export interface BlockchainStatusSource {
  getBlockchainStatus(): Promise<BlockchainStatus>;
}
