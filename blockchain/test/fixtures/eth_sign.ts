import { Signer, utils } from 'ethers';
/**
 * Produce a secp256k1 signature over the hash of the proof and the associated nonce
 * used for replay protection
 */
export async function ethSign(user: Signer, signingData: Buffer) {
  const msgHash = utils.solidityKeccak256(['bytes'], [signingData]);
  const digest = utils.arrayify(msgHash);
  const signature: string = await user.signMessage(digest);
  return { signature: Buffer.from(signature.slice(2), 'hex'), digest };
}
