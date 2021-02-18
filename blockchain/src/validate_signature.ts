import { EthAddress } from 'barretenberg/address';
import { ethers } from 'ethers';
import { hashData } from './hash_data';

export function validateSignature(publicOwner: EthAddress, signature: Buffer, signingData: Buffer) {
  const msgHash = hashData(signingData);
  const digest = ethers.utils.arrayify(msgHash);
  const recoveredSigner = ethers.utils.verifyMessage(digest, `0x${signature.toString('hex')}`);
  return recoveredSigner.toLowerCase() === publicOwner.toString().toLowerCase();
}
