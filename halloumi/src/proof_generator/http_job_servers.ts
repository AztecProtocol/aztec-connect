import { ProofGenerator } from './proof_generator';
import { HttpJobServer } from './http_job_server';
import { ProofId } from './proof_request';

/**
 * Wraps instances of HttpJobServer to allow farming out different job types on different queues.
 */
export class HttpJobServers implements ProofGenerator {
  private txRollupAndClaimServer: HttpJobServer;
  private rootAndVerifierServer: HttpJobServer;

  constructor(ackTimeout = 5000) {
    this.txRollupAndClaimServer = new HttpJobServer(8082, ackTimeout);
    this.rootAndVerifierServer = new HttpJobServer(8083, ackTimeout);
  }

  public async start() {
    await this.txRollupAndClaimServer.start();
    await this.rootAndVerifierServer.start();
  }

  public async stop() {
    await this.txRollupAndClaimServer.stop();
    await this.rootAndVerifierServer.stop();
  }

  public async reset() {}

  public async getJoinSplitVk() {
    return this.rootAndVerifierServer.getJoinSplitVk();
  }

  public async getAccountVk() {
    return this.rootAndVerifierServer.getAccountVk();
  }

  public createProof(data: Buffer): Promise<Buffer> {
    const proofId = data.readUInt32BE(0) as ProofId;
    if (proofId == ProofId.CLAIM || proofId == ProofId.TX_ROLLUP) {
      return this.txRollupAndClaimServer.createProof(data);
    } else {
      return this.rootAndVerifierServer.createProof(data);
    }
  }
}
