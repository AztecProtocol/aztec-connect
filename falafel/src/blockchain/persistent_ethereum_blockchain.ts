import { EthAddress } from 'barretenberg/address';
import { MemoryFifo } from 'barretenberg/fifo';
import { Proof } from 'barretenberg/rollup_provider/rollup_provider';
import { Block, Blockchain, EthereumBlockchain, PermitArgs } from 'blockchain';
import { Connection, MoreThanOrEqual, Repository } from 'typeorm';
import { BlockDao } from '../entity/block';
import { blockDaoToBlock, blockToBlockDao } from './blockdao_convert';

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
    const fromRollup = latest ? latest.rollupId + 1 : 0;
    console.log(`Persisting blocks from ${fromRollup}...`);
    const blocks = await this.ethereumBlockchain.getBlocks(fromRollup);
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

  public getTokenContractAddresses() {
    return this.ethereumBlockchain.getTokenContractAddresses();
  }

  public async getBlocks(from: number) {
    return (await this.blockRep.find({ where: { rollupId: MoreThanOrEqual(from) } })).map(blockDaoToBlock);
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
    const fromRollup = latest ? latest.rollupId + 1 : 0;
    await this.ethereumBlockchain.start(fromRollup);
  }

  public stop() {
    this.ethereumBlockchain.stop();
    this.blockQueue.cancel();
  }

  public async getStatus() {
    return this.ethereumBlockchain.getStatus();
  }

  public async sendProof(proof: Proof) {
    return this.ethereumBlockchain.sendProof(proof);
  }

  public getTransactionReceipt(txHash: Buffer) {
    return this.ethereumBlockchain.getTransactionReceipt(txHash);
  }

  public sendRollupProof(
    proof: Buffer,
    signatures: Buffer[],
    sigIndexes: number[],
    viewingKeys: Buffer[],
    signingAddress?: EthAddress,
  ) {
    return this.ethereumBlockchain.sendRollupProof(proof, signatures, sigIndexes, viewingKeys, signingAddress);
  }

  public async depositPendingFunds(
    assetId: number,
    amount: bigint,
    depositorAddress: EthAddress,
    permitArgs?: PermitArgs,
  ) {
    return this.ethereumBlockchain.depositPendingFunds(assetId, amount, depositorAddress, permitArgs);
  }

  public async validateDepositFunds(publicOwner: EthAddress, publicInput: bigint, assetId: number) {
    return this.ethereumBlockchain.validateDepositFunds(publicOwner, publicInput, assetId);
  }

  public validateSignature(publicOwner: EthAddress, signature: Buffer, proof: Buffer) {
    return this.ethereumBlockchain.validateSignature(publicOwner, signature, proof);
  }

  private async saveBlock(block: Block) {
    await this.blockRep.save(blockToBlockDao(block));
    this.latestRollupId = block.rollupId;
  }

  async getPendingNoteNullifiers() {
    return [];
  }
}
