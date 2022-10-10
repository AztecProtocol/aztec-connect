export interface ProofGenerator {
  start(): Promise<void>;
  stop(): Promise<void>;
  interrupt(): Promise<void>;
  getJoinSplitVk(): Promise<Buffer>;
  getAccountVk(): Promise<Buffer>;
  createProof(data: Buffer): Promise<Buffer>;
}
