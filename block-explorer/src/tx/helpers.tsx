interface ProofData {
  proofId: number;
  publicInput: Buffer;
  publicOutput: Buffer;
  assetId: Buffer;
  newNote1: Buffer;
  newNote2: Buffer;
  nullifier1: Buffer;
  nullifier2: Buffer;
  inputOwner: Buffer;
  outputOwner: Buffer;
}

export function parseRawProofData(rawProofData: Buffer): ProofData {
  return {
    proofId: rawProofData.readUInt32BE(28),
    publicInput: rawProofData.slice(1 * 32, 1 * 32 + 32),
    publicOutput: rawProofData.slice(2 * 32, 2 * 32 + 32),
    assetId: rawProofData.slice(3 * 32, 3 * 32 + 32),
    newNote1: rawProofData.slice(4 * 32, 4 * 32 + 64),
    newNote2: rawProofData.slice(6 * 32, 6 * 32 + 64),
    nullifier1: rawProofData.slice(8 * 32, 8 * 32 + 32),
    nullifier2: rawProofData.slice(9 * 32, 9 * 32 + 32),
    inputOwner: rawProofData.slice(10 * 32, 10 * 32 + 32),
    outputOwner: rawProofData.slice(11 * 32, 11 * 32 + 32),
  };
}
