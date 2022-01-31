import { TransactionReceipt, TransactionResponse } from '@ethersproject/abstract-provider';
import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from '@aztec/barretenberg/address';
import { Block } from './block_source';
import { RollupProofData } from './rollup_proof';
import { TxHash } from '@aztec/barretenberg/blockchain';
import { Contract, ethers, Signer } from 'ethers';
import { abi as RollupABI } from './abi/RollupProcessor.json';

export class RollupProcessor {
  private rollupProcessor: Contract;

  constructor(rollupContractAddress: EthAddress, private provider: Web3Provider) {
    this.rollupProcessor = new ethers.Contract(rollupContractAddress.toString(), RollupABI, this.provider);
  }

  async getRollupBlocksFrom(rollupId: number, minConfirmations: number) {
    const rollupFilter = this.rollupProcessor.filters.RollupProcessed(rollupId);
    const [rollupEvent] = await this.rollupProcessor.queryFilter(rollupFilter);
    if (!rollupEvent) {
      return [];
    }
    const filter = this.rollupProcessor.filters.RollupProcessed();
    const rollupEvents = await this.rollupProcessor.queryFilter(filter, rollupEvent.blockNumber);
    const txs = (await Promise.all(rollupEvents.map(event => event.getTransaction()))).filter(
      tx => tx.confirmations >= minConfirmations,
    );
    const receipts = await Promise.all(txs.map(tx => this.provider.getTransactionReceipt(tx.hash)));
    const blocks = await Promise.all(txs.map(tx => this.provider.getBlock(tx.blockNumber!)));
    return txs.map((tx, i) => this.decodeBlock({ ...tx, timestamp: blocks[i].timestamp }, receipts[0]));
  }

  private decodeBlock(tx: TransactionResponse, receipt: TransactionReceipt): Block {
    const rollupAbi = new ethers.utils.Interface(RollupABI);
    const result = rollupAbi.parseTransaction({ data: tx.data });
    const rollupProofData = Buffer.from(result.args.proofData.slice(2), 'hex');
    const viewingKeysData = Buffer.from(result.args.viewingKeys.slice(2), 'hex');
    const gasPriceString: string = tx.gasPrice?.toString() ?? '0';

    return {
      created: new Date(tx.timestamp! * 1000),
      txHash: TxHash.fromString(tx.hash),
      rollupProofData,
      viewingKeysData,
      rollupId: RollupProofData.getRollupIdFromBuffer(rollupProofData),
      rollupSize: RollupProofData.getRollupSizeFromBuffer(rollupProofData),
      gasPrice: BigInt(gasPriceString),
      gasUsed: receipt.gasUsed.toNumber(),
    };
  }
}
