/**
 * Format signatures into a format easily useable in solidity. Pad v to 32 bytes
 */
export function solidityFormatSignatures(signatures: Buffer[]) {
  const paddedSignatures = signatures.map(currentSignature => {
    const v = currentSignature.slice(-1);
    return Buffer.concat([currentSignature.slice(0, 64), Buffer.alloc(31), v]);
  });
  return Buffer.concat(paddedSignatures);
}
