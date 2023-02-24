import {
  deserializeBufferFromVector,
  Deserializer,
  numToUInt32BE,
  serializeBigInt,
  serializeBufferArrayToVector,
  serializeBufferToVector,
  serializeDate,
} from '../serialize/index.js';
import { TxHash } from '../blockchain/index.js';
import { DefiInteractionEvent } from './defi_interaction_event.js';
import { EventEmitter } from 'stream';

export class Block {
  constructor(
    public txHash: TxHash,
    public mined: Date,
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
    const mined = des.date();
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
        mined,
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
      serializeDate(this.mined),
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
   * Returns up to `take` blocks from rollup id `from`.
   * This does not guarantee all blocks are returned. It may return a subset, and the
   * client should use `getLatestRollupId()` to determine if it needs to make further requests.
   */
  getBlocks(from: number, take?: number): Promise<Block[]>;

  /**
   * Starts emitting rollup blocks.
   * All historical blocks must have been emitted before this function returns.
   */
  start(fromBlock?: number): Promise<void>;

  stop(): Promise<void>;

  on(event: 'block', fn: (block: Block) => void): this;
  on(event: 'versionMismatch', fn: (error: string) => void): this;

  removeAllListeners(): this;

  getLatestRollupId(): Promise<number>;
}

export * from './server_block_source.js';
export * from './defi_interaction_event.js';
export * from './decoded_block.js';
