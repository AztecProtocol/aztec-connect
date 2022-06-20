import { BarretenbergWasm } from '../wasm';
import { Crs } from '../crs';
import createDebug from 'debug';
import { createWorker, destroyWorker } from '../wasm/worker_factory';

const debug = createDebug('bb::pippenger_test');

describe('pippenger', () => {
  it('should not blow up', async () => {
    const wasm = await BarretenbergWasm.new();

    const numPoints = 4 * 1024;

    const crs = new Crs(numPoints);
    await crs.download();

    const crsData = crs.getData();
    const crsPtr = wasm.exports().bbmalloc(crsData.length);
    wasm.transferToHeap(crsData, crsPtr);
    const pippengerPtr = wasm.exports().new_pippenger(crsPtr, numPoints);
    wasm.exports().bbfree(crsPtr);

    const scalars = Buffer.alloc(numPoints * 32);
    const mem = wasm.exports().bbmalloc(scalars.length);

    wasm.transferToHeap(scalars, mem);
    wasm.exports().pippenger_unsafe(pippengerPtr, mem, 0, numPoints, 0);
    wasm.exports().bbfree(mem);

    debug('mem:', wasm.memSize());
  }, 60000);

  it('should not blow up with worker', async () => {
    const wasm = await createWorker('worker_test');

    const numPoints = 4 * 1024;

    const crs = new Crs(numPoints);
    await crs.download();

    const crsData = crs.getData();
    const crsPtr = await wasm.call('bbmalloc', crsData.length);
    await wasm.transferToHeap(crsData, crsPtr);
    await wasm.call('bbfree', crsPtr);

    const scalars = Buffer.alloc(numPoints * 32);
    const mem = await wasm.call('bbmalloc', scalars.length);

    await wasm.transferToHeap(scalars, mem);
    // await wasm.call('pippenger_unsafe', pippengerPtr, mem, 0, numPoints, 0);
    await wasm.call('bbfree', mem);

    debug('mem:', await wasm.memSize());

    await destroyWorker(wasm);
  }, 60000);
});
