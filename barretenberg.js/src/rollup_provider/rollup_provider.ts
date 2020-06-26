export interface Proof {
  proofData: Buffer;
  viewingKeys: Buffer[];
}

export interface RollupProviderStatus {
  dataSize: number;
  dataRoot: Buffer;
  nullRoot: Buffer;
}

export interface ProofResponse {
  txHash: Buffer;
}

export interface RollupProvider {
  sendProof(proof: Proof): Promise<ProofResponse>;
  status(): Promise<RollupProviderStatus>;
}
