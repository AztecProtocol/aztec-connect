export interface Note {
  index: number;
  value: bigint;
  dataEntry: Buffer;
  viewingKey: Buffer;
  encrypted: Buffer;
  nullifier: Buffer;
  nullified: boolean;
  owner: Buffer;
}
