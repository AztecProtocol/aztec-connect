import { fetchCode, BarretenbergWasm } from '../wasm';
import { Crs } from '../crs';
import createDebug from 'debug';

const debug = createDebug('pippenger');

describe('pippenger', () => {
  it('should not blow up', async () => {
    const code = await fetchCode();
    const module = new WebAssembly.Module(code);

    const wasm = new BarretenbergWasm();
    await wasm.init(module);

    const numPoints = 4*1024;

    const crs = new Crs(numPoints);
    await crs.download();

    const crsData = crs.getData();
    const crsPtr = wasm.exports().bbmalloc(crsData.length);
    wasm.transferToHeap(crsData, crsPtr);
    const pointTablePtr = wasm.exports().new_pippenger(crsPtr, numPoints);
    wasm.exports().bbfree(crsPtr);

    const scalars = Buffer.alloc(numPoints * 32);
    const mem = wasm.exports().bbmalloc(scalars.length);

    wasm.transferToHeap(scalars, mem);
    wasm.exports().pippenger_unsafe(mem, 0, numPoints, pointTablePtr, 0);
    wasm.exports().bbfree(mem);

    debug('mem: ', wasm.getMemory().length);
  }, 60000);
});
