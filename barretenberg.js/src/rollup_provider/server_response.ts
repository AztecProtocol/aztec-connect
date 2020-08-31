import { LinkedRollup, RollupStatus } from './rollup_provider_explorer';

export interface RollupProviderStatusServerResponse {
  chainId: number;
  networkOrHost: string;
  rollupContractAddress: string;
  tokenContractAddress: string;
  dataSize: number;
  dataRoot: string;
  nullRoot: string;
}

export interface RollupServerResponse {
  id: number;
  status: RollupStatus;
  dataRoot: string;
  txHashes: string[];
  proofData?: string;
  ethBlock?: number;
  ethTxHash?: string;
  created: string;
}

export interface ProofServerResponse {
  txHash: string;
}

export interface TxServerResponse {
  txHash: string;
  rollup?: LinkedRollup;
  proofData: string;
  viewingKeys: string[];
  created: string;
}
