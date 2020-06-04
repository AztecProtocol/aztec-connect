export interface Bufferable {
  toBuffer(): Buffer;
}

function isBufferArray(arr: Bufferable[] | Buffer[]): arr is Buffer[] {
  return Buffer.isBuffer(arr[0]);
}

// Buffer: Treat as a variable length array.
// Buffer[]: Treat as an array of fixed length elements.
// Bufferable[]: Treat as a variable length of recursively bufferable elements.
export function serializeVector(arr: Bufferable[] | Buffer | Buffer[]) {
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(arr.length, 0);
  if (Buffer.isBuffer(arr)) {
    return Buffer.concat([lengthBuf, arr]);
  }
  if (isBufferArray(arr)) {
    return Buffer.concat([ lengthBuf, ...arr]);
  }
  return Buffer.concat([lengthBuf, ...arr.map(e => e.toBuffer())]);
}
