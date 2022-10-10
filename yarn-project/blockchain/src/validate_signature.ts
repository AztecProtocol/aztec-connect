import { EthAddress } from '@aztec/barretenberg/address';
import { ethers } from 'ethers';

export function validateSignature(publicOwner: EthAddress, signature: Buffer, signingData: Buffer) {
  const recoveredSigner = ethers.utils.verifyMessage(signingData, `0x${signature.toString('hex')}`);
  return recoveredSigner.toLowerCase() === publicOwner.toString().toLowerCase();
}
