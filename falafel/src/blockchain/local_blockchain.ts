import { RollupProofData } from 'barretenberg/rollup_proof';
import { Block, Blockchain, Receipt } from 'blockchain';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { blockDaoToBlock, blockToBlockDao } from './blockdao_convert';

export class LocalBlockchain extends EventEmitter implements Blockchain {
  private blockNum = 0;
  private dataStartIndex = 0;
  private blockRep!: Repository<BlockDao>;
  private blockchain: Block[] = [];
  private running = false;

  constructor(private connection: Connection, private rollupSize: number) {
    super();
  }

  public async getNetworkInfo() {
    return {
      chainId: 0,
      networkOrHost: 'development',
    };
  }

  public getRollupContractAddress() {
    return '';
  }

  public getTokenContractAddress() {
    return '';
  }

  public async start() {
    this.running = true;

    this.blockRep = this.connection.getRepository(BlockDao);

    this.blockchain = await this.loadBlocks();

    const [lastBlock] = this.blockchain.slice(-1);
    if (lastBlock) {
      if (lastBlock.rollupSize !== this.rollupSize) {
        throw new Error(`Previous data on chain has a rollup size of ${lastBlock.rollupSize}.`);
      }
      this.blockNum = lastBlock.blockNum + 1;
      this.dataStartIndex = this.blockchain.length * this.rollupSize * 2;
    }

    console.log(`Local blockchain restored: (blocks: ${this.blockNum})`);
  }

  public stop() {
    this.running = false;
  }

  public async sendProof(
    proofData: Buffer,
    signatures: Buffer[],
    sigIndexes: number[],
    viewingKeys: Buffer[],
    rollupSize: number,
  ) {
    if (!this.running) {
      throw new Error('Blockchain is not accessible.');
    }

    const viewingKeysData = Buffer.concat(viewingKeys);
    const rollup = RollupProofData.fromBuffer(proofData, viewingKeysData);

    if (rollup.dataStartIndex !== this.dataStartIndex) {
      throw new Error(`Incorrect dataStartIndex. Expecting ${this.dataStartIndex}. Got ${rollup.dataStartIndex}.`);
    }

    const txHash = randomBytes(32);
    const block: Block = {
      txHash,
      blockNum: this.blockNum,
      rollupSize,
      rollupProofData: proofData,
      viewingKeysData,
      created: new Date(),
    };

    this.blockNum++;
    this.dataStartIndex += rollupSize * 2;
    this.blockchain.push(block);

    await this.saveBlock(block);

    await new Promise(resolve => setTimeout(resolve, 1000));

    return txHash;
  }

  public async getTransactionReceipt(txHash: Buffer) {
    const block = await this.blockRep.findOne({ txHash });
    if (!block) {
      throw new Error(`Block does not exist: ${txHash.toString('hex')}`);
    }

    return {
      blockNum: block.id,
    } as Receipt;
  }

  private async saveBlock(block: Block) {
    await this.blockRep.save(blockToBlockDao(block));
  }

  private async loadBlocks() {
    const blockDaos = await this.blockRep.find();
    return blockDaos.map(blockDaoToBlock);
  }

  public async getBlocks(from: number): Promise<Block[]> {
    return this.blockchain.slice(from);
  }

  public async validateDepositFunds(publicOwner: Buffer, publicInput: Buffer) {
    return true;
  }

  public validateSignature(publicOwnerBuf: Buffer, signature: Buffer, proof: Buffer) {
    return true;
  }
}
