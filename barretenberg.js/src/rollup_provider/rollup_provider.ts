export interface Proof {
  proofData: Buffer;
  viewingKeys: Buffer[];
  depositSignature?: Buffer;
}

export interface RollupProviderStatus {
  chainId: number;
  networkOrHost: string;
  rollupContractAddress: string;
  tokenContractAddress: string;
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
