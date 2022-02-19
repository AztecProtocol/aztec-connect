export interface ProofGenerator {
  start(): Promise<void>;
  stop(): Promise<void>;
  reset(): Promise<void>;
  getJoinSplitVk(): Promise<Buffer>;
  getAccountVk(): Promise<Buffer>;
  createProof(data: Buffer): Promise<Buffer>;
}
