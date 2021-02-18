import { ethers } from 'ethers';

export function hashData(signingData: Buffer) {
  return ethers.utils.solidityKeccak256(['bytes'], [signingData]);
}
