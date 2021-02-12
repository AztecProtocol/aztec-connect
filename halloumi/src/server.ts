import { readFile } from 'fs-extra';
import { CliProofGenerator } from './proof_generator';

export interface ServerConfig {
  readonly maxCircuitSize: number;
}

export class Server {
  private proofGenerator: CliProofGenerator;
  private ready = false;

  constructor(config: ServerConfig) {
    const { maxCircuitSize } = config;
    this.proofGenerator = new CliProofGenerator(maxCircuitSize);
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
    return await readFile('./data/join_split/verification_key');
  }

  public async getAccountVerificationKey() {
    return await readFile('./data/account/verification_key');
  }

  public async createProof(data: Buffer) {
    return await this.proofGenerator.createProof(data);
  }

  public async reset() {
    await this.proofGenerator.stop();
    await this.proofGenerator.start();
  }
}
