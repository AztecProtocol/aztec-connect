import { EthAddress } from 'barretenberg/address';
import { InnerProofData, RollupProofData, VIEWING_KEY_SIZE } from 'barretenberg/rollup_proof';
import { Proof } from 'barretenberg/rollup_provider';
import { numToUInt32BE } from 'barretenberg/serialize';
import { Block, Blockchain, Receipt } from 'blockchain';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { blockDaoToBlock, blockToBlockDao } from './blockdao_convert';

const generateRollup = (rollupId: number, rollupSize: number) => {
  const innerProofs = new Array(rollupSize)
    .fill(0)
    .map(
      () =>
        new InnerProofData(
          0,
          numToUInt32BE(0, 32),
          numToUInt32BE(0, 32),
          0,
          randomBytes(64),
          randomBytes(64),
          randomBytes(32),
          randomBytes(32),
          EthAddress.ZERO,
          EthAddress.ZERO,
          [randomBytes(VIEWING_KEY_SIZE), randomBytes(VIEWING_KEY_SIZE)],
        ),
    );
  return new RollupProofData(
    rollupId,
    rollupSize,
    rollupId * rollupSize * 2,
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    randomBytes(32),
    rollupSize,
    innerProofs,
  );
};

export class LocalBlockchain extends EventEmitter implements Blockchain {
  private blockNum = 0;
  private dataStartIndex = 0;
  private blockRep!: Repository<BlockDao>;
  private blocks: Block[] = [];
  private running = false;

  constructor(private connection: Connection, private rollupSize: number, private initialBlocks = 0) {
    super();
  }

  public getLatestRollupId() {
    return this.blocks.length
      ? RollupProofData.getRollupIdFromBuffer(this.blocks[this.blocks.length - 1].rollupProofData)
      : -1;
  }

  public async getNetworkInfo() {
    // Pretend to be ropsten (chainId = 3).
    return {
      chainId: 3,
      networkOrHost: 'development',
    };
  }

  public getRollupContractAddress() {
    return EthAddress.ZERO;
  }

  public getTokenContractAddresses() {
    return [EthAddress.ZERO];
  }

  public async start() {
    this.running = true;

    this.blockRep = this.connection.getRepository(BlockDao);

    this.blocks = await this.loadBlocks();

    // Preload some random data if required.
    for (let i = this.blocks.length; i < this.initialBlocks; ++i) {
      const rollup = generateRollup(i, this.rollupSize);
      await this.createBlockFromRollup(this.rollupSize, rollup.toBuffer(), rollup.getViewingKeyData());
    }

    const [lastBlock] = this.blocks.slice(-1);
    if (lastBlock) {
      if (lastBlock.rollupSize !== this.rollupSize) {
        throw new Error(`Previous data on chain has a rollup size of ${lastBlock.rollupSize}.`);
      }
      this.blockNum = lastBlock.blockNum + 1;
      this.dataStartIndex = this.blocks.length * this.rollupSize * 2;
    }

    console.log(`Local blockchain restored: (blocks: ${this.blockNum})`);
  }

  public stop() {
    this.running = false;
  }

  public async status() {
    const { chainId, networkOrHost } = await this.getNetworkInfo();

    return {
      serviceName: 'falafel',
      chainId,
      networkOrHost,
      tokenContractAddresses: this.getTokenContractAddresses(),
      rollupContractAddress: this.getRollupContractAddress(),
      nextRollupId: this.blockNum,
      dataRoot: Buffer.alloc(32),
      nullRoot: Buffer.alloc(32),
      dataSize: this.dataStartIndex,
    };
  }

  public async sendProof({ proofData, viewingKeys }: Proof) {
    return this.sendRollupProof(proofData, [], [], viewingKeys);
  }

  public async sendRollupProof(proofData: Buffer, signatures: Buffer[], sigIndexes: number[], viewingKeys: Buffer[]) {
    if (!this.running) {
      throw new Error('Blockchain is not accessible.');
    }

    const viewingKeysData = Buffer.concat(viewingKeys);
    const rollup = RollupProofData.fromBuffer(proofData, viewingKeysData);

    if (rollup.dataStartIndex !== this.dataStartIndex) {
      throw new Error(`Incorrect dataStartIndex. Expecting ${this.dataStartIndex}. Got ${rollup.dataStartIndex}.`);
    }

    const txHash = await this.createBlockFromRollup(rollup.rollupSize, proofData, viewingKeysData);

    await new Promise(resolve => setTimeout(resolve, 1000));

    return txHash;
  }

  private async createBlockFromRollup(rollupSize: number, proofData: Buffer, viewingKeysData: Buffer) {
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
    this.blocks.push(block);

    await this.saveBlock(block);

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
    return this.blocks.slice(from);
  }

  public async validateDepositFunds(publicOwner: Buffer, publicInput: Buffer) {
    return true;
  }

  public validateSignature(publicOwnerBuf: Buffer, signature: Buffer, proof: Buffer) {
    return true;
  }
}
