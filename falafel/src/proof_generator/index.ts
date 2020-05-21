import { ChildProcess, spawn } from 'child_process';
import { PromiseReadable } from 'promise-readable';
import { createInterface } from 'readline';
import { Rollup } from '../rollup';

export class ProofGenerator {
  private proc?: ChildProcess;
  private stdout: any;
  private busy = false;

  constructor(private rollupSize: number) {}

  public async run() {
    this.launch();
  }

  public cancel() {
    if (this.proc) {
      this.proc.kill('SIGINT');
      this.proc = undefined;
    }
  }

  public async createProof(rollup: Rollup) {
    if (this.busy) {
      throw new Error('Cannot create more than one proof simulataneously.');
    }

    const buffer = rollup.toBuffer();
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

  private launch() {
    const binPath = '../barretenberg/build/src/aztec/rollup/rollup_cli/rollup_cli';
    const proc = (this.proc = spawn(binPath, [this.rollupSize.toString(), '../barretenberg/srs_db/ignition']));
    this.stdout = new PromiseReadable(proc!.stdout!);

    const rl = createInterface({
      input: proc.stderr,
      crlfDelay: Infinity,
    });
    rl.on('line', (line: string) => console.log('rollup_cli: ' + line.trim()));

    proc.on('close', code => {
      this.proc = undefined;
      if (code !== 0) {
        console.log(`rollup_proof exited with unexpected code ${code}.`);
      }
    });

    proc.on('error', console.log);
  }
}
