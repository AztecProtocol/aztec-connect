import { Crs } from '../crs/index.js';
import { createWorker } from '../wasm/index.js';
import { SinglePippenger } from './single_pippenger.js';

describe('pippenger', () => {
  it('should not blow up', async () => {
    const numPoints = 4 * 1024;
    const crs = new Crs(numPoints);
    await crs.init();

    const wasm = await createWorker();
    const pippenger = new SinglePippenger(wasm);
    await pippenger.init(crs.getData());

    const scalars = Buffer.alloc(numPoints * 32);
    await pippenger.pippengerUnsafe(scalars, 0, numPoints);

    await pippenger.destroy();

    await wasm.destroyWorker();
  }, 60000);
});
