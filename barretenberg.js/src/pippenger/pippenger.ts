export interface Pippenger {
  init(crsData: Uint8Array): Promise<void>;
  pippengerUnsafe(scalars: Uint8Array, from: number, range: number): Promise<Buffer>;
}
