import { pathExists, mkdirp } from 'fs-extra';
import { fetch } from 'barretenberg/iso_fetch';
import { ChildProcess, spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { PromiseReadable } from 'promise-readable';
import { createInterface } from 'readline';
import { TxRollup } from './tx_rollup';
import { RootRollup } from './root_rollup';
import { numToUInt32BE } from 'barretenberg/serialize';

export class ProofGenerator {
  private proc?: ChildProcess;
  private stdout: any;

  constructor(private txRollupSize: number, private rootRollupSize: number) {
    if (!txRollupSize || !rootRollupSize) {
      throw new Error('Rollup sizes must be greater than 0.');
    }
  }

  public async start() {
    await this.ensureCrs();
    this.launch();
    const initByte = await this.stdout.read(1);
    if (initByte[0] !== 1) {
      throw new Error('Failed to initialize rollup_cli.');
    }
    console.log('Proof generator initialized.');
  }

  public stop() {
    if (this.proc) {
      this.proc.kill('SIGINT');
      this.proc = undefined;
    }
  }

  /**
   * TODO: Should signal to the rollup_cli to stop what it's doing and await new work.
   * This will require the rollup_cli to fork child processes, and for the parent process to terminate the child.
   */
  public interrupt() {}

  /**
   * TODO: Clear the interrupt flag allowing for continued proof creation.
   */
  public clearInterrupt() {}

  private async createProof(buffer: Buffer) {
    this.proc!.stdin!.write(buffer);

    const header = (await this.stdout.read(4)) as Buffer | undefined;

    if (!header) {
      throw new Error('Failed to read length.');
    }

    const proofLength = header.readUInt32BE(0);

    const data = (await this.stdout.read(proofLength + 1)) as Buffer | undefined;

    if (!data) {
      throw new Error('Failed to read data.');
    }

    const verified = data.readUInt8(proofLength);

    return verified ? data.slice(0, -1) : undefined;
  }

  public async createTxRollupProof(txRollup: TxRollup) {
    this.proc!.stdin!.write(numToUInt32BE(0));
    return this.createProof(txRollup.toBuffer());
  }

  public async createAggregateProof(rootRollup: RootRollup) {
    this.proc!.stdin!.write(numToUInt32BE(1));
    return this.createProof(rootRollup.toBuffer());
  }

  private async ensureCrs() {
    const pointPerTranscript = 5040000;
    for (let i = 0, required = 2 ** 25; required > 0; i++, required -= pointPerTranscript) {
      await this.downloadTranscript(i);
    }
  }

  private async downloadTranscript(n: number) {
    const id = String(n).padStart(2, '0');
    if (await pathExists(`./data/crs/transcript${id}.dat`)) {
      return;
    }
    console.log(`Downloading crs: transcript${id}.dat...`);
    await mkdirp('./data/crs');
    const response = await fetch(`http://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/sealed/transcript${id}.dat`);
    if (response.status !== 200) {
      throw new Error('Failed to download crs.');
    }
    const out = createWriteStream(`./data/crs/transcript${id}.dat`);
    return new Promise(resolve => {
      out.once('close', resolve);
      (response.body as any).pipe(out);
    });
  }

  private launch() {
    const binPath = '../barretenberg/build/src/aztec/rollup/rollup_cli/rollup_cli';
    const proc = (this.proc = spawn(binPath, [
      this.txRollupSize.toString(),
      this.rootRollupSize.toString(),
      './data/crs',
    ]));
    this.stdout = new PromiseReadable(proc!.stdout!);

    const rl = createInterface({
      input: proc.stderr,
      crlfDelay: Infinity,
    });
    rl.on('line', (line: string) => console.log('rollup_cli: ' + line.trim()));

    proc.on('close', (code, signal) => {
      this.proc = undefined;
      if (code !== 0) {
        console.log(`rollup_cli exited with unexpected code or signal: ${code || signal}.`);
      }
    });

    proc.on('error', console.log);
  }
}
