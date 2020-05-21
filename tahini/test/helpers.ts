import { utils } from 'ethers';

export function randomHex(hexLength: number): string {
  return utils.hexlify(utils.randomBytes(hexLength)).slice(2);
}

export function createRandomNote() {
  return { note: Buffer.from(randomHex(50)), blockNum: 4, nullifier: false, owner: randomHex(20) };
}
