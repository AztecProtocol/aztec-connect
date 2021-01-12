import { EthAddress } from 'barretenberg/address';
import { RollupProvider, TxHash } from 'barretenberg/rollup_provider';
import { PermitArgs } from './contracts';

export { Block } from 'barretenberg/block_source';
export { PermitArgs } from './contracts';

export interface NetworkInfo {
  chainId: number;
  networkOrHost: string;
}

export interface Receipt {
  status: boolean;
  blockNum: number;
}

export interface Blockchain extends RollupProvider {
  getTransactionReceipt(txHash: TxHash): Promise<Receipt>;
  validateDepositFunds(publicOwner: EthAddress, publicInput: bigint, assetId: number): Promise<boolean>;
  validateSignature(publicOwner: EthAddress, signature: Buffer, proof: Buffer): boolean;
  getNetworkInfo(): Promise<NetworkInfo>;
  getRollupContractAddress(): EthAddress;
  getFeeDistributorContractAddress(): EthAddress;
  getTokenContractAddresses(): EthAddress[];
  getEthBalance(account: EthAddress): Promise<bigint>;
  depositPendingFunds(
    assetId: number,
    amount: bigint,
    depositorAddress: EthAddress,
    permitArgs?: PermitArgs,
  ): Promise<TxHash>;
  sendRollupProof(
    proof: Buffer,
    signatures: Buffer[],
    sigIndexes: number[],
    viewingKeys: Buffer[],
    providerSignature: Buffer,
    feeReceiver: EthAddress,
    feeLimit: bigint,
    signingAddress?: EthAddress,
  ): Promise<TxHash>;
}
