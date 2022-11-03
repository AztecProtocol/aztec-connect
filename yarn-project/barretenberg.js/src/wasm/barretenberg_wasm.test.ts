import { BarretenbergWasm } from './barretenberg_wasm.js';

describe('barretenberg wasm', () => {
  it('should new', async () => {
    await BarretenbergWasm.new('test');
  });

  it('should new malloc, transfer and slice mem', async () => {
    const wasm = await BarretenbergWasm.new('test');
    const length = 1024;
    const ptr = wasm.call('bbmalloc', length);
    const buf = Buffer.alloc(length, 128);
    wasm.transferToHeap(buf, ptr);
    wasm.call('bbfree', ptr);
    const result = Buffer.from(wasm.sliceMemory(ptr, ptr + length));
    expect(result).toStrictEqual(buf);
  });
});
