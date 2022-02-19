import { CliProofGenerator } from './proof_generator';

export interface ServerConfig {
  readonly maxCircuitSize: number;
  readonly txsPerInner: number;
  readonly innersPerRoot: number;
  readonly proverless: boolean;
  readonly lazyInit: boolean;
  readonly persist: boolean;
  readonly dataDir: string;
}

export class Server {
  private proofGenerator: CliProofGenerator;
  private ready = false;

  constructor(config: ServerConfig) {
    const { maxCircuitSize, txsPerInner, innersPerRoot, proverless, lazyInit, persist, dataDir } = config;
    this.proofGenerator = new CliProofGenerator(
      maxCircuitSize,
      txsPerInner,
      innersPerRoot,
      proverless,
      lazyInit,
      persist,
      dataDir,
    );
  }

  public async start() {
    console.log('Server initializing...');
    await this.proofGenerator.start();
    this.ready = true;
    console.log('Server ready to receive txs.');
  }

  public async stop() {
    console.log('Server stop...');
    this.ready = false;
    this.proofGenerator.stop();
  }

  public isReady() {
    return this.ready;
  }

  public async getJoinSplitVerificationKey() {
    return await this.proofGenerator.getJoinSplitVk();
  }

  public async getAccountVerificationKey() {
    return await this.proofGenerator.getAccountVk();
  }

  public async createProof(data: Buffer) {
    return await this.proofGenerator.createProof(data);
  }

  public async reset() {
    await this.proofGenerator.reset();
  }
}
