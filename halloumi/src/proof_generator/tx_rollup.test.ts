import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { randomBytes, randomInt } from 'crypto';
import { TxRollup } from './tx_rollup';

const randomRoot = () => randomBytes(32);
const randomDataPath = () => new HashPath([...Array(32)].map(() => [randomBytes(32), randomBytes(32)]));
const randomNullPath = () => new HashPath([...Array(256)].map(() => [randomBytes(32), randomBytes(32)]));

describe('Rollup', () => {
  it('serialize rollup data to buffer and deserialize it back', () => {
    const numberOfTxs = 2;
    const proofs = [...Array(numberOfTxs)].map(() => randomBytes(300));
    const linkedCommitmentPaths = [...Array(numberOfTxs)].map(randomDataPath);
    const linkedCommitmentIndices = [...Array(numberOfTxs)].map(() => randomInt(1000));
    const oldDataPath = randomDataPath();
    const newNullRoots = [...Array(numberOfTxs * 2)].map(randomRoot);
    const oldNullPaths = [...Array(numberOfTxs * 2)].map(randomNullPath);
    const dataRootsPaths = [...Array(numberOfTxs)].map(randomDataPath);
    const dataRootsIndicies = [1, 2];
    const bridgeIds = [...Array(4)].map(() => BridgeId.random().toBuffer());
    const assetIds = [...Array(4)].map(() => numToUInt32BE(randomInt(100), 32));
    const rollup = new TxRollup(
      0,
      1,
      proofs,
      randomRoot(),
      randomRoot(),
      oldDataPath,
      linkedCommitmentPaths,
      linkedCommitmentIndices,
      randomRoot(),
      newNullRoots,
      oldNullPaths,
      randomRoot(),
      dataRootsPaths,
      dataRootsIndicies,
      randomRoot(),
      bridgeIds,
      assetIds,
    );

    const buf = rollup.toBuffer();
    expect(buf).toBeInstanceOf(Buffer);

    const recovered = TxRollup.fromBuffer(buf);
    expect(recovered).toEqual(rollup);
  });
});
