import { EthAddress } from 'barretenberg/address';
import { ethers } from 'ethers';

export function validateSignature(publicOwner: EthAddress, signature: Buffer, signingData: Buffer) {
  const msgHash = ethers.utils.solidityKeccak256(['bytes'], [signingData]);
  const digest = ethers.utils.arrayify(msgHash);
  const recoveredSigner = ethers.utils.verifyMessage(digest, `0x${signature.toString('hex')}`);
  return recoveredSigner.toLowerCase() === publicOwner.toString().toLowerCase();
}
