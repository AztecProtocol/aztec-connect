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
  decimals: number;
  symbol: string;
  name: string;
  isFeePaying: boolean;
  gasConstants: number[];
  gasLimit: number;
}

export interface BlockchainAssetJson {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  isFeePaying: boolean;
  gasConstants: number[];
  gasLimit: number;
}

export const blockchainAssetToJson = ({ address, ...asset }: BlockchainAsset): BlockchainAssetJson => ({
  ...asset,
  address: address.toString(),
});

export const blockchainAssetFromJson = ({ address, ...asset }: BlockchainAssetJson): BlockchainAsset => ({
  ...asset,
  address: EthAddress.fromString(address),
});

export interface BlockchainBridge {
  id: number;
  address: EthAddress;
  gasLimit: number;
}

export interface BlockchainBridgeJson {
  id: number;
  address: string;
  gasLimit: number;
}

export const blockchainBridgeToJson = ({ address, ...bridge }: BlockchainBridge): BlockchainBridgeJson => ({
  ...bridge,
  address: address.toString(),
});

export const blockchainBridgeFromJson = ({ address, ...bridge }: BlockchainBridgeJson): BlockchainBridge => ({
  ...bridge,
  address: EthAddress.fromString(address),
});

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
  allowThirdPartyContracts: boolean;
  numEscapeBlocksRemaining: number;
  assets: BlockchainAsset[];
  bridges: BlockchainBridge[];
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
  allowThirdPartyContracts: boolean;
  numEscapeBlocksRemaining: number;
  assets: BlockchainAssetJson[];
  bridges: BlockchainBridgeJson[];
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
    assets: status.assets.map(blockchainAssetToJson),
    bridges: status.bridges.map(blockchainBridgeToJson),
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
    assets: json.assets.map(blockchainAssetFromJson),
    bridges: json.bridges.map(blockchainBridgeFromJson),
  };
}

export interface BlockchainStatusSource {
  getBlockchainStatus(): BlockchainStatus;
}
