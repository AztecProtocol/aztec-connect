/**
 * Format all signatures into useful solidity format. EVM word size is 32bytes
 * and we're supplying a concatenated array of signatures - so need each ECDSA
 * param (v, r, s) to occupy 32 bytes.
 *
 * Zero left padding v by 31 bytes.
 */
export function solidityFormatSignatures(signatures: Buffer[]) {
  const paddedSignatures = signatures.map(currentSignature => {
    const v = currentSignature.slice(-1);
    return Buffer.concat([currentSignature.slice(0, 64), Buffer.alloc(31), v]);
  });
  return Buffer.concat(paddedSignatures);
}
