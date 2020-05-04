export interface Proof {
  proofData: Buffer;
  encViewingKey1: Buffer;
  encViewingKey2: Buffer;
}

export interface RollupProvider {
  sendProof(proof: Proof): Promise<void>;
}

export * from './local_rollup_provider';
export * from './server_rollup_provider';
