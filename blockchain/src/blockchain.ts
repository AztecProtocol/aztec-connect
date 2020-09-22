import { EthAddress } from 'barretenberg/address';
import { RollupProvider } from 'barretenberg/rollup_provider';

export { Block } from 'barretenberg/block_source';

export interface NetworkInfo {
  chainId: number;
  networkOrHost: string;
}

export interface Receipt {
  blockNum: number;
}

export interface Blockchain extends RollupProvider {
  getTransactionReceipt(txHash: Buffer): Promise<Receipt>;
  validateDepositFunds(publicOwner: Buffer, publicInput: Buffer): Promise<boolean>;
  validateSignature(publicOwnerBuf: Buffer, signature: Buffer, proof: Buffer): boolean;
  getNetworkInfo(): Promise<NetworkInfo>;
  getRollupContractAddress(): EthAddress;
  getTokenContractAddress(): EthAddress;
  sendRollupProof(proof: Buffer, signatures: Buffer[], sigIndexes: number[], viewingKeys: Buffer[]): Promise<Buffer>;
}
