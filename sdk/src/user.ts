import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { randomBytes } from 'crypto';

export interface User {
  id: number;
  privateKey?: Buffer;
  publicKey: Buffer;
  alias?: string;
}

export class UserFactory {
  constructor(private grumpkin: Grumpkin) {}

  createUser(id: number, alias?: string): User {
    const privateKey = randomBytes(32);
    const publicKey = this.grumpkin.mul(Grumpkin.one, privateKey);
    return { id, privateKey, publicKey, alias };
  }
}
