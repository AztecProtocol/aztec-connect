export interface Proof {
  proofData: Buffer,
  encryptedViewingKey1: Buffer,
  encryptedViewingKey2: Buffer,
};

export interface RollupProvider {
  sendProof(proof: Proof): Promise<void>;
}
