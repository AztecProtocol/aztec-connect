import { HashPath } from 'barretenberg/merkle_tree';
import { randomBytes } from 'crypto';
import { Rollup } from './';

const randomRoot = () => randomBytes(32);
const randomDataPath = () => new HashPath([...Array(32)].map(() => [randomBytes(32), randomBytes(32)]));
const randomNullPath = () => new HashPath([...Array(128)].map(() => [randomBytes(32), randomBytes(32)]));

describe('Rollup', () => {
  it('serialize rollup data to buffer and deserialize it back', () => {
    const numberOfTxs = 2;
    const proofs = [...Array(numberOfTxs)].map(() => randomBytes(300));
    const oldDataPath = randomDataPath();
    const newDataPath = randomDataPath();
    const newNullRoots = [...Array(numberOfTxs * 2)].map(randomRoot);
    const oldNullPaths = [...Array(numberOfTxs * 2)].map(randomNullPath);
    const newNullPaths = [...Array(numberOfTxs * 2)].map(randomNullPath);
    const accountNullPaths = [...Array(numberOfTxs)].map(randomNullPath);
    const dataRootsPaths = [...Array(numberOfTxs)].map(randomDataPath);
    const rollup = new Rollup(
      0,
      1,
      proofs,
      randomRoot(),
      randomRoot(),
      randomRoot(),
      oldDataPath,
      newDataPath,
      randomRoot(),
      newNullRoots,
      oldNullPaths,
      newNullPaths,
      accountNullPaths,
      randomRoot(),
      randomRoot(),
      randomDataPath(),
      randomDataPath(),
      dataRootsPaths,
      [1, 2],
    );

    const buf = rollup.toBuffer();
    expect(buf).toBeInstanceOf(Buffer);

    const recovered = Rollup.fromBuffer(buf);
    expect(recovered).toEqual(rollup);
  });
});
