import { BarretenbergWasm } from '../../wasm';

export class Aes128 {
  constructor(private wasm: BarretenbergWasm) {}

  public encryptBufferCBC(data: Uint8Array, iv: Uint8Array, key: Uint8Array) {
    const rawLength = data.length;
    const numPaddingBytes = rawLength % 16 != 0 ? 16 - (rawLength % 16) : 0;
    const paddingBuffer = Buffer.alloc(numPaddingBytes);
    // input num bytes needs to be a multiple of 16
    // node uses PKCS#7-Padding scheme, where padding byte value = the number of padding bytes
    if (numPaddingBytes != 0) {
      paddingBuffer.fill(numPaddingBytes);
    }
    const input = Buffer.concat([data, paddingBuffer]);
    const mem = this.wasm.call('bbmalloc', input.length + key.length + iv.length + input.length);
    this.wasm.transferToHeap(input, mem);
    this.wasm.transferToHeap(iv, mem + input.length);
    this.wasm.transferToHeap(key, mem + input.length + iv.length);
    this.wasm.call(
      'aes__encrypt_buffer_cbc',
      mem,
      mem + input.length,
      mem + input.length + iv.length,
      input.length,
      mem + input.length + iv.length + key.length,
    );
    const result: Buffer = Buffer.from(
      this.wasm.sliceMemory(
        mem + input.length + key.length + iv.length,
        mem + input.length + key.length + iv.length + input.length,
      ),
    );
    this.wasm.call('bbfree', mem);
    return result;
  }

  public decryptBufferCBC(data: Uint8Array, iv: Uint8Array, key: Uint8Array) {
    const mem = this.wasm.call('bbmalloc', data.length + key.length + iv.length + data.length);
    this.wasm.transferToHeap(data, mem);
    this.wasm.transferToHeap(iv, mem + data.length);
    this.wasm.transferToHeap(key, mem + data.length + iv.length);
    this.wasm.call(
      'aes__decrypt_buffer_cbc',
      mem,
      mem + data.length,
      mem + data.length + iv.length,
      data.length,
      mem + data.length + iv.length + key.length,
    );
    const result: Buffer = Buffer.from(
      this.wasm.sliceMemory(
        mem + data.length + key.length + iv.length,
        mem + data.length + key.length + iv.length + data.length,
      ),
    );
    this.wasm.call('bbfree', mem);
    return result;
  }
}
