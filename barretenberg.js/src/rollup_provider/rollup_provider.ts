import { EthAddress } from '../address';
import { BlockSource } from '../block_source';

export interface Proof {
  proofData: Buffer;
  viewingKeys: Buffer[];
  depositSignature?: Buffer;
}

export interface RollupProviderStatus {
  chainId: number;
  networkOrHost: string;
  rollupContractAddress: EthAddress;
  tokenContractAddress: EthAddress;
  nextRollupId: number;
  dataSize: number;
  dataRoot: Buffer;
  nullRoot: Buffer;
}

export type TxHash = Buffer;

export interface RollupProvider extends BlockSource {
  sendProof(proof: Proof): Promise<TxHash>;
  status(): Promise<RollupProviderStatus>;
}
