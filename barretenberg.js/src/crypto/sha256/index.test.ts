import { BarretenbergWasm } from '../../wasm';
import { Sha256 } from '.';

import { randomBytes, createHash } from 'crypto';

describe('sha256', () => {
  let barretenberg!: BarretenbergWasm;
  let sha256!: Sha256;

  beforeAll(async () => {
    barretenberg = new BarretenbergWasm();
    await barretenberg.init();
    sha256 = new Sha256(barretenberg);
  });

  it('should correctly hash data', () => {
    const data = randomBytes(67);

    const expected = createHash('sha256').update(data).digest();

    const result: Buffer = sha256.hash(data);
    expect(result).toEqual(expected);
  });
});
