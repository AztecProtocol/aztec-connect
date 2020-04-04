export interface Pippenger {
  pippengerUnsafe(scalars: Uint8Array, from: number, range: number): Promise<Buffer>;
}