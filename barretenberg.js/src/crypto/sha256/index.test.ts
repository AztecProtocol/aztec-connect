import { BarretenbergWasm } from '../../wasm/index.js';
import { sha256, Sha256 } from './index.js';
import { randomBytes, createHash } from 'crypto';

describe('sha256', () => {
  let barretenberg!: BarretenbergWasm;

  beforeAll(async () => {
    barretenberg = new BarretenbergWasm();
    await barretenberg.init();
  });

  it('should correctly hash data using wasm', () => {
    const data = randomBytes(67);

    const expected = createHash('sha256').update(data).digest();

    const sha256 = new Sha256(barretenberg);
    const result = sha256.hash(data);
    expect(result).toEqual(expected);
  });

  it('should correctly hash data using js', () => {
    const data = randomBytes(67);

    const expected = createHash('sha256').update(data).digest();

    const result = sha256(data);
    expect(result).toEqual(expected);
  });
});
