import { Grumpkin } from 'barretenberg-es/ecc/grumpkin';
import { randomBytes } from 'crypto';

export interface User {
  id: number;
  privateKey: Buffer;
  publicKey: Buffer;
}

export function createUser(id: number, grumpkin: Grumpkin): User {
  const privateKey = randomBytes(32);
  const publicKey = grumpkin.mul(Grumpkin.one, privateKey);
  return { id, privateKey, publicKey };
}
