import {
  deserializeBufferFromVector,
  Deserializer,
  numToUInt32BE,
  serializeBigInt,
  serializeBufferArrayToVector,
  serializeBufferToVector,
  serializeDate,
} from '../serialize';
import { TxHash } from '../blockchain';
import { DefiInteractionEvent } from './defi_interaction_event';
import { EventEmitter } from 'stream';

export class Block {
  constructor(
    public txHash: TxHash,
    public created: Date,
    public rollupId: number,
    public rollupSize: number,
    public encodedRollupProofData: Buffer,
    public offchainTxData: Buffer[],
    public interactionResult: DefiInteractionEvent[],
    public gasUsed: number,
    public gasPrice: bigint,
    public subtreeRoot?: Buffer,
  ) {}

  static deserialize(buf: Buffer, offset = 0) {
    const des = new Deserializer(buf, offset);
    const txHash = des.exec(TxHash.deserialize);
    const created = des.date();
    const rollupId = des.uInt32();
    const rollupSize = des.uInt32();
    const rollupProofData = des.vector();
    const offchainTxData = des.deserializeArray(deserializeBufferFromVector);
    const interactionResult = des.deserializeArray(DefiInteractionEvent.deserialize);
    const gasUsed = des.uInt32();
    const gasPrice = des.bigInt();
    const subtreeRoot = des.vector();
    return {
      elem: new Block(
        txHash,
        created,
        rollupId,
        rollupSize,
        rollupProofData,
        offchainTxData,
        interactionResult,
        gasUsed,
        gasPrice,
        subtreeRoot.equals(Buffer.alloc(0)) ? undefined : subtreeRoot,
      ),
      adv: des.getOffset() - offset,
    };
  }

  static fromBuffer(buf: Buffer) {
    return Block.deserialize(buf).elem;
  }

  toBuffer() {
    return Buffer.concat([
      this.txHash.toBuffer(),
      serializeDate(this.created),
      numToUInt32BE(this.rollupId),
      numToUInt32BE(this.rollupSize),
      serializeBufferToVector(this.encodedRollupProofData),
      serializeBufferArrayToVector(this.offchainTxData.map(b => serializeBufferToVector(b))),
      serializeBufferArrayToVector(this.interactionResult.map(b => b.toBuffer())),
      numToUInt32BE(this.gasUsed),
      serializeBigInt(this.gasPrice),
      serializeBufferToVector(this.subtreeRoot ?? Buffer.alloc(0)),
    ]);
  }
}

export interface BlockSource extends EventEmitter {
  /**
   * Returns blocks from rollup id `from`.
   * This does not guarantee all blocks are returned. It may return a subset, and the
   * client should use `getLatestRollupId()` to determine if it needs to make further requests.
   */
  getBlocks(from: number): Promise<Block[]>;

  /**
   * Starts emitting rollup blocks.
   * All historical blocks must have been emitted before this function returns.
   */
  start(fromBlock?: number): Promise<void>;

  stop(): Promise<void>;

  on(event: 'block', fn: (block: Block) => void): this;

  removeAllListeners(): this;

  getLatestRollupId(): Promise<number>;
}

export * from './server_block_source';
export * from './defi_interaction_event';
