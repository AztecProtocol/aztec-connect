export interface ProofGenerator {
  awaitReady(): Promise<void>;
  reset(): Promise<void>;
  getJoinSplitVk(): Promise<Buffer>;
  getAccountVk(): Promise<Buffer>;
  createProof(data: Buffer): Promise<Buffer>;
}
