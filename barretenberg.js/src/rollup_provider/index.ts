export interface Proof {
  proofData: Buffer;
  encViewingKey1: Buffer;
  encViewingKey2: Buffer;
}

export interface RollupProviderStatus {
  dataSize: number;
  dataRoot: Buffer;
  nullRoot: Buffer;
}

export interface RollupProvider {
  sendProof(proof: Proof): Promise<void>;
  status(): Promise<RollupProviderStatus>;
}

export * from './local_rollup_provider';
export * from './server_rollup_provider';
