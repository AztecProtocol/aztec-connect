import { MemoryFifo } from 'barretenberg/fifo';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { Proof } from 'barretenberg/rollup_provider/rollup_provider';
import { Block, Blockchain, EthereumBlockchain } from 'blockchain';
import createDebug from 'debug';
import { Connection, MoreThanOrEqual, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { blockDaoToBlock, blockToBlockDao } from './blockdao_convert';

const debug = createDebug('bb:persistent_ethereum_blockchain');

export class PersistentEthereumBlockchain implements Blockchain {
  private blockRep!: Repository<BlockDao>;
  private blockQueue = new MemoryFifo<Block>();
  private latestRollupId = -1;

  constructor(private ethereumBlockchain: EthereumBlockchain, connection: Connection) {
    this.blockRep = connection.getRepository(BlockDao);
  }

  public static async new(ethereumBlockchain: EthereumBlockchain, connection: Connection) {
    const instance = new PersistentEthereumBlockchain(ethereumBlockchain, connection);
    await instance.init();
    return instance;
  }

  public async init() {
    // Make sure all historical blocks are inserted.
    const latest = await this.blockRep.findOne(undefined, { order: { id: 'DESC' } });
    const fromBlock = latest ? latest.id + 1 : 0;
    const blocks = await this.ethereumBlockchain.getBlocks(fromBlock);
    for (const block of blocks) {
      await this.saveBlock(block);
    }
  }

  public getLatestRollupId() {
    return this.latestRollupId;
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
    return (await this.blockRep.find({ where: { id: MoreThanOrEqual(from) } })).map(blockDaoToBlock);
  }

  public on(event: string, fn: (block: Block) => void) {
    this.ethereumBlockchain.on(event, fn);
  }

  public removeAllListeners() {
    this.ethereumBlockchain.removeAllListeners();
  }

  public async start() {
    this.ethereumBlockchain.on('block', b => this.blockQueue.put(b));
    this.blockQueue.process(b => this.saveBlock(b));
    const latest = await this.blockRep.findOne(undefined, { order: { id: 'DESC' } });
    const fromBlock = latest ? latest.id + 1 : 0;
    await this.ethereumBlockchain.start(fromBlock);
  }

  public stop() {
    this.ethereumBlockchain.stop();
    this.blockQueue.cancel();
  }

  public async status() {
    return this.ethereumBlockchain.status();
  }

  public async sendProof(proof: Proof) {
    return this.ethereumBlockchain.sendProof(proof);
  }

  public getTransactionReceipt(txHash: Buffer) {
    return this.ethereumBlockchain.getTransactionReceipt(txHash);
  }

  public sendRollupProof(proof: Buffer, signatures: Buffer[], sigIndexes: number[], viewingKeys: Buffer[]) {
    return this.ethereumBlockchain.sendRollupProof(proof, signatures, sigIndexes, viewingKeys);
  }

  public async validateDepositFunds(publicOwner: Buffer, publicInput: Buffer) {
    return this.ethereumBlockchain.validateDepositFunds(publicOwner, publicInput);
  }

  public validateSignature(publicOwnerBuf: Buffer, signature: Buffer, proof: Buffer) {
    return this.ethereumBlockchain.validateSignature(publicOwnerBuf, signature, proof);
  }

  private async saveBlock(block: Block) {
    await this.blockRep.save(blockToBlockDao(block));
    this.latestRollupId = RollupProofData.getRollupIdFromBuffer(block.rollupProofData);
  }
}
