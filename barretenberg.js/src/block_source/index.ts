import {
  deserializeBufferFromVector,
  Deserializer,
  numToUInt32BE,
  serializeBigInt,
  serializeBufferArrayToVector,
  serializeBufferToVector,
  serializeDate,
} from '../serialize';
import { DefiInteractionNote } from '../note_algorithms';
import { TxHash } from '../blockchain';

export class Block {
  constructor(
    public txHash: TxHash,
    public created: Date,
    public rollupId: number,
    public rollupSize: number,
    public rollupProofData: Buffer,
    public offchainTxData: Buffer[],
    public interactionResult: DefiInteractionNote[],
    public gasUsed: number,
    public gasPrice: bigint,
  ) {}

  static deserialize(buf: Buffer, offset = 0) {
    const des = new Deserializer(buf, offset);
    const txHash = des.exec(TxHash.deserialize);
    const created = des.date();
    const rollupId = des.uInt32();
    const rollupSize = des.uInt32();
    const rollupProofData = des.buffer();
    const offchainTxData = des.deserializeArray(deserializeBufferFromVector);
    const interactionResult = des.deserializeArray(DefiInteractionNote.deserialize);
    const gasUsed = des.uInt32();
    const gasPrice = des.bigInt();
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
      serializeBufferToVector(this.rollupProofData),
      serializeBufferArrayToVector(this.offchainTxData.map(b => serializeBufferToVector(b))),
      serializeBufferArrayToVector(this.interactionResult.map(b => b.toBuffer())),
      numToUInt32BE(this.gasUsed),
      serializeBigInt(this.gasPrice),
    ]);
  }
}

export interface BlockSource {
  /**
   * Returns all blocks from rollup id `from`.
   * In the future this will *not* guarantee *all* blocks are returned. It may return a subset, and the
   * client should use `getLatestRollupId()` to determine if it needs to make further requests.
   */
  getBlocks(from: number): Promise<Block[]>;

  /**
   * Starts emitting rollup blocks.
   * All historical blocks must have been emitted before this function returns.
   */
  start(fromBlock?: number);

  stop(): Promise<void>;

  on(event: 'block', fn: (block: Block) => void);

  removeAllListeners();

  getLatestRollupId(): number;
}

export * from './server_block_source';
