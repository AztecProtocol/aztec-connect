import { EthAddress } from 'barretenberg/address';
import { RollupProvider } from 'barretenberg/rollup_provider';

export { Block } from 'barretenberg/block_source';

export interface NetworkInfo {
  chainId: number;
  networkOrHost: string;
  blockNumber: number;
}

export interface Receipt {
  status: boolean;
  blockNum: number;
}

export interface Blockchain extends RollupProvider {
  getTransactionReceipt(txHash: Buffer): Promise<Receipt>;
  validateDepositFunds(publicOwner: Buffer, publicInput: Buffer, assetId: number): Promise<boolean>;
  validateSignature(publicOwnerBuf: Buffer, signature: Buffer, proof: Buffer): boolean;
  getNetworkInfo(): Promise<NetworkInfo>;
  getRollupContractAddress(): EthAddress;
  getTokenContractAddresses(): EthAddress[];
  sendRollupProof(proof: Buffer, signatures: Buffer[], sigIndexes: number[], viewingKeys: Buffer[]): Promise<Buffer>;
}
