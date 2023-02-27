export interface Pippenger {
  init(crsData: Uint8Array): Promise<void>;
  destroy(): Promise<void>;
  pippengerUnsafe(scalars: Uint8Array, from: number, range: number): Promise<Buffer>;
}
