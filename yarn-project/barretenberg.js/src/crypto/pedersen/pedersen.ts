export interface Pedersen {
  init(): Promise<void>;

  compress(lhs: Uint8Array, rhs: Uint8Array): Buffer;

  compressInputs(inputs: Buffer[]): Buffer;

  compressWithHashIndex(inputs: Buffer[], hashIndex: number): Buffer;

  hashToField(data: Buffer): Buffer;

  hashToTree(values: Buffer[]): Promise<Buffer[]>;
}
