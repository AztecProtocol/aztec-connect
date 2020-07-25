import { MemoryFifo } from 'barretenberg/fifo';
import { Block, Blockchain, EthereumBlockchain } from 'blockchain';
import createDebug from 'debug';
import { Connection, MoreThanOrEqual, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { blockDaoToBlock, blockToBlockDao } from './blockdao_convert';

const debug = createDebug('bb:persistent_ethereum_blockchain');

export class PersistentEthereumBlockchain implements Blockchain {
  private blockRep!: Repository<BlockDao>;
  private blockQueue = new MemoryFifo<Block>();

  constructor(private ethereumBlockchain: EthereumBlockchain, connection: Connection) {
    this.blockRep = connection.getRepository(BlockDao);
    this.ethereumBlockchain.on('block', b => this.blockQueue.put(b));
    this.blockQueue.process(b => this.saveBlock(b));
  }

  public async getNetworkInfo() {
    return this.ethereumBlockchain.getNetworkInfo();
  }

  public getRollupContractAddress() {
    return this.ethereumBlockchain.getRollupContractAddress();
  }

  public getTokenContractAddress() {
    return this.ethereumBlockchain.getTokenContractAddress();
  }

  public async getBlocks(from: number) {
    // To ensure we return any blocks outstanding in the queue, wait until the queue is flushed.
    if (this.blockQueue.length()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return (await this.blockRep.find({ where: { id: MoreThanOrEqual(from) } })).map(blockDaoToBlock);
  }

  public on(event: string, fn: (block: Block) => void) {
    this.ethereumBlockchain.on(event, fn);
  }

  public removeAllListeners() {
    this.ethereumBlockchain.removeAllListeners();
  }

  public async start() {
    const latest = await this.blockRep.findOne(undefined, { order: { id: 'DESC' } });
    const fromBlock = latest ? latest.id : 0;
    await this.ethereumBlockchain.start(fromBlock + 1);
  }

  public stop() {
    this.ethereumBlockchain.stop();
    this.blockQueue.cancel();
  }

  public getTransactionReceipt(txHash: Buffer) {
    return this.ethereumBlockchain.getTransactionReceipt(txHash);
  }

  public sendProof(
    proof: Buffer,
    signatures: Buffer[],
    sigIndexes: number[],
    viewingKeys: Buffer[],
    rollupSize: number,
  ) {
    return this.ethereumBlockchain.sendProof(proof, signatures, sigIndexes, viewingKeys, rollupSize);
  }

  public async validateDepositFunds(publicOwner: Buffer, publicInput: Buffer) {
    return this.ethereumBlockchain.validateDepositFunds(publicOwner, publicInput);
  }

  public validateSignature(publicOwnerBuf: Buffer, signature: Buffer, proof: Buffer) {
    return this.ethereumBlockchain.validateSignature(publicOwnerBuf, signature, proof);
  }
  private async saveBlock(block: Block) {
    await this.blockRep.save(blockToBlockDao(block));
  }
}
