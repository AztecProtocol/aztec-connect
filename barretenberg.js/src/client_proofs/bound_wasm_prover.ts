/**
 * This is a generic interface to a provers WASM bindings.
 */
export interface BoundWasmProver {
  computeKey(): Promise<void>;

  loadKey(keyBuf: Uint8Array): Promise<void>;

  getKey(): Promise<Buffer>;

  createProof(tx: Buffer): Promise<Buffer>;
}
