import { EthAddress } from 'barretenberg/address';
import { assetIds } from 'barretenberg/client_proofs';
import { InnerProofData, RollupProofData, VIEWING_KEY_SIZE } from 'barretenberg/rollup_proof';
import { Proof, TxHash } from 'barretenberg/rollup_provider';
import { numToUInt32BE } from 'barretenberg/serialize';
import { Block, Blockchain, PermitArgs, Receipt } from 'blockchain';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { Connection, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { blockDaoToBlock, blockToBlockDao } from './blockdao_convert';

const generate = <T>(count: number, generator: () => T): T[] => new Array(count).fill(0).map(generator);

const generateRollup = (rollupId: number, rollupSize: number) => {
  const innerProofs = generate(
    rollupSize,
    () =>
      new InnerProofData(
        0,
        numToUInt32BE(0, 32),
        numToUInt32BE(0, 32),
        numToUInt32BE(0, 32),
        randomBytes(64),
        randomBytes(64),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
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
    generate(RollupProofData.NUMBER_OF_ASSETS, () => randomBytes(32)),
    rollupSize,
    innerProofs,
    randomBytes(16 * 32),
    [[randomBytes(VIEWING_KEY_SIZE), randomBytes(VIEWING_KEY_SIZE)]],
  );
};

export class LocalBlockchain extends EventEmitter implements Blockchain {
  private dataStartIndex = 0;
  private blockRep!: Repository<BlockDao>;
  private blocks: Block[] = [];
  private running = false;

  constructor(private connection: Connection, private rollupSize: number, private initialBlocks = 0) {
    super();
  }

  public getLatestRollupId() {
    return this.blocks.length ? this.blocks[this.blocks.length - 1].rollupId : -1;
  }

  public async getNetworkInfo() {
    // Pretend to be goerli (chainId = 5).
    return {
      chainId: 5,
      networkOrHost: 'development',
    };
  }

  public getRollupContractAddress() {
    return EthAddress.ZERO;
  }

  public getFeeDistributorContractAddress() {
    return EthAddress.ZERO;
  }

  public getTokenContractAddresses() {
    return [EthAddress.ZERO];
  }

  public async getEthBalance(account: EthAddress) {
    return BigInt(0);
  }

  public async start() {
    this.running = true;

    this.blockRep = this.connection.getRepository(BlockDao);

    this.blocks = await this.loadBlocks();

    // Preload some random data if required.
    for (let i = this.blocks.length; i < this.initialBlocks; ++i) {
      const rollup = generateRollup(i, this.rollupSize);
      await this.addBlock(rollup, rollup.toBuffer(), rollup.getViewingKeyData());
    }

    const [lastBlock] = this.blocks.slice(-1);
    if (lastBlock) {
      if (lastBlock.rollupSize !== this.rollupSize) {
        throw new Error(`Previous data on chain has a rollup size of ${lastBlock.rollupSize}.`);
      }
      this.dataStartIndex = this.blocks.length * this.rollupSize * 2;
    }

    console.log(`Local blockchain restored: (blocks: ${this.blocks.length})`);
  }

  public stop() {
    this.running = false;
  }

  public async getStatus() {
    const { chainId, networkOrHost } = await this.getNetworkInfo();

    const fees = new Map();
    assetIds.forEach(assetId => {
      fees.set(assetId, BigInt(0));
    });

    return {
      serviceName: 'falafel',
      chainId,
      networkOrHost,
      tokenContractAddresses: this.getTokenContractAddresses(),
      rollupContractAddress: this.getRollupContractAddress(),
      nextRollupId: this.blocks.length,
      dataRoot: Buffer.alloc(32),
      nullRoot: Buffer.alloc(32),
      rootRoot: Buffer.alloc(32),
      dataSize: this.dataStartIndex,
      escapeOpen: false,
      numEscapeBlocksRemaining: 0,
      fees,
    };
  }

  public async sendProof({ proofData, viewingKeys }: Proof) {
    return this.sendRollupProof(proofData, [], viewingKeys);
  }

  public async sendRollupProof(proofData: Buffer, signatures: Buffer[], viewingKeys: Buffer[]) {
    if (!this.running) {
      throw new Error('Blockchain is not accessible.');
    }

    const viewingKeysData = Buffer.concat(viewingKeys);
    const rollup = RollupProofData.fromBuffer(proofData, viewingKeysData);

    if (rollup.dataStartIndex !== this.dataStartIndex) {
      throw new Error(`Incorrect dataStartIndex. Expecting ${this.dataStartIndex}. Got ${rollup.dataStartIndex}.`);
    }

    const txHash = await this.addBlock(rollup, proofData, viewingKeysData);

    await new Promise(resolve => setTimeout(resolve, 1000));

    return txHash;
  }

  private async addBlock(rollup: RollupProofData, proofData: Buffer, viewingKeysData: Buffer) {
    const txHash = TxHash.random();
    const block: Block = {
      txHash,
      rollupId: rollup.rollupId,
      rollupSize: rollup.rollupSize,
      rollupProofData: proofData,
      viewingKeysData,
      created: new Date(),
    };

    this.dataStartIndex += rollup.rollupSize * 2;
    this.blocks.push(block);

    await this.saveBlock(block);

    return txHash;
  }

  public async depositPendingFunds(
    assetId: number,
    amount: bigint,
    depositorAddress: EthAddress,
    permitArgs?: PermitArgs,
  ) {
    return TxHash.random();
  }

  public async getTransactionReceipt(txHash: TxHash) {
    const block = await this.blockRep.findOne({ txHash: txHash.toBuffer() });
    if (!block) {
      throw new Error(`Block does not exist: ${txHash}`);
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

  public async validateDepositFunds() {
    return true;
  }

  public validateSignature() {
    return true;
  }

  async getPendingNoteNullifiers() {
    return [];
  }
}
