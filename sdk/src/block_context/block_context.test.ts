import { BlockContext } from './block_context';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { Block } from '@aztec/barretenberg/block_source';
import { TxHash } from '@aztec/barretenberg/blockchain';
import { HashPath, MemoryMerkleTree } from '@aztec/barretenberg/merkle_tree';
import { randomBytes } from 'crypto';

const buildRollup = (rollupId: number, dataStartIndex: number, numTxs: number) => {
  return RollupProofData.randomData(rollupId, numTxs, dataStartIndex, undefined, []);
};

const buildBlock = (rollupId: number, dataStartIndex: number, rollupSize: number) => {
  const rollup = buildRollup(rollupId, dataStartIndex, rollupSize);
  const block = new Block(
    TxHash.random(),
    new Date(),
    rollupId,
    rollupSize,
    rollup.toBuffer(),
    [],
    [],
    1000,
    1000000n,
    undefined,
  );
  return block;
};

const buildRandomHashPath = (depth: number) => {
  const bufs = Array(depth).fill([randomBytes(32), randomBytes(32)]);
  return new HashPath(bufs);
};

describe('block_context', () => {
  const expectedHashPaths: { [key: number]: HashPath } = {};

  const merkleTree = {
    getHashPath: jest.fn().mockImplementation((index: number) => {
      return expectedHashPaths[index];
    }),
  } as any;

  const pedersen = {} as any;

  const mockMerkleFactory = jest.fn().mockResolvedValue(merkleTree);
  MemoryMerkleTree.new = mockMerkleFactory;

  beforeEach(() => {
    merkleTree.getHashPath.mockClear();
    mockMerkleFactory.mockClear();
  });

  it('should provide expected hash path', async () => {
    const block = buildBlock(1, 64, 32);
    const blockContext = new BlockContext(block, pedersen);
    const noteIndex = 75;
    const indexIntoBlock = noteIndex - 64;
    expectedHashPaths[indexIntoBlock] = buildRandomHashPath(5);
    expect((await blockContext.getBlockSubtreeHashPath(noteIndex)).toBuffer()).toEqual(
      expectedHashPaths[indexIntoBlock].toBuffer(),
    );
    expect(mockMerkleFactory).toBeCalledTimes(1);
    expect(mockMerkleFactory.mock.calls[0][0]).toEqual(
      RollupProofData.fromBuffer(block.rollupProofData).innerProofData.flatMap(x => [
        x.noteCommitment1,
        x.noteCommitment2,
      ]),
    );
    expect(merkleTree.getHashPath).toBeCalledTimes(1);
    expect(merkleTree.getHashPath.mock.calls[0][0]).toEqual(indexIntoBlock);
  });

  it('should throw if index out of bounds', async () => {
    const block = buildBlock(1, 64, 32);
    const blockContext = new BlockContext(block, pedersen);
    await expect(async () => {
      await blockContext.getBlockSubtreeHashPath(129);
    }).rejects.toThrow('Index out of bounds.');
    await expect(async () => {
      await blockContext.getBlockSubtreeHashPath(63);
    }).rejects.toThrow('Index out of bounds.');
  });

  it('should only build sub tree once', async () => {
    const block = buildBlock(3, 192, 32);
    const blockContext = new BlockContext(block, pedersen);
    for (let i = 0; i < 64; i++) {
      const noteIndex = 192 + i;
      const indexIntoBlock = i;
      expectedHashPaths[indexIntoBlock] = buildRandomHashPath(5);
      expect((await blockContext.getBlockSubtreeHashPath(noteIndex)).toBuffer()).toEqual(
        expectedHashPaths[indexIntoBlock].toBuffer(),
      );
      expect(merkleTree.getHashPath).toBeCalledTimes(i + 1);
      expect(merkleTree.getHashPath.mock.calls[i][0]).toEqual(indexIntoBlock);
    }
    expect(mockMerkleFactory).toBeCalledTimes(1);
    expect(mockMerkleFactory.mock.calls[0][0]).toEqual(
      RollupProofData.fromBuffer(block.rollupProofData).innerProofData.flatMap(x => [
        x.noteCommitment1,
        x.noteCommitment2,
      ]),
    );
  });

  it('should not build sub tree if not required', async () => {
    const block = buildBlock(3, 192, 32);
    new BlockContext(block, pedersen);
    expect(mockMerkleFactory).toBeCalledTimes(0);
  });

  it('should only build sub tree once with concurrent calls', async () => {
    const block = buildBlock(3, 192, 32);
    const blockContext = new BlockContext(block, pedersen);
    for (let i = 0; i < 64; i++) {
      expectedHashPaths[i] = buildRandomHashPath(5);
    }
    const numConcurrent = 100;
    await Promise.all(
      Array.from({ length: numConcurrent }, async () => {
        for (let i = 0; i < 64; i++) {
          const noteIndex = 192 + i;
          const indexIntoBlock = i;
          expect((await blockContext.getBlockSubtreeHashPath(noteIndex)).toBuffer()).toEqual(
            expectedHashPaths[indexIntoBlock].toBuffer(),
          );
        }
      }),
    );

    expect(merkleTree.getHashPath).toBeCalledTimes(64 * numConcurrent);
    expect(mockMerkleFactory).toBeCalledTimes(1);
    expect(mockMerkleFactory.mock.calls[0][0]).toEqual(
      RollupProofData.fromBuffer(block.rollupProofData).innerProofData.flatMap(x => [
        x.noteCommitment1,
        x.noteCommitment2,
      ]),
    );
  });
});
