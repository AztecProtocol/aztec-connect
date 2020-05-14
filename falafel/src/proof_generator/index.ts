import { ChildProcess, spawn } from 'child_process';
import { PromiseReadable } from 'promise-readable';
import { MemoryFifo } from '../fifo';
import { Rollup } from '../rollup';

interface QueueElement {
  rollup: Rollup;
  resolve: (proof?: Buffer) => void;
}

export class ProofGenerator {
  private proc?: ChildProcess;
  private queue = new MemoryFifo<QueueElement>();

  constructor(private rollupSize: number) {}

  public async run() {
    this.launch();

    const stdout = new PromiseReadable(this.proc!.stdout!);

    while (true) {
      const element = await this.queue.get();
      if (!element) {
        break;
      }
      const buffer = element.rollup.toBuffer();
      this.proc!.stdin!.write(buffer);

      const header = (await stdout.read(4)) as Buffer | undefined;

      if (!header) {
        console.log('Failed to read length.');
        break;
      }

      const proofLength = header.readUInt32BE(0);

      const data = (await stdout.read(proofLength + 1)) as Buffer | undefined;

      if (!data) {
        console.log('Failed to read data.');
        break;
      }

      const verified = data.readUInt8(proofLength);

      element.resolve(verified ? data.slice(0, -1) : undefined);
    }

    console.log('Proof generator thread complete.');
  }

  public cancel() {
    if (this.proc) {
      this.proc.kill('SIGINT');
      this.proc = undefined;
    }
  }

  public async createProof(rollup: Rollup) {
    return new Promise<Buffer | undefined>(resolve => this.queue.put({ rollup, resolve }));
  }

  private launch() {
    const binPath = '../barretenberg/build/src/aztec/rollup/rollup_cli/rollup_cli';
    const proc = (this.proc = spawn(binPath, [this.rollupSize.toString(), '../barretenberg/srs_db/ignition']));

    // proc.stdout.on('data', data => console.log(data.toString().trim()));
    proc.stderr.on('data', data => console.log('rollup_cli: ' + data.toString().trim()));
    proc.on('close', code => {
      this.proc = undefined;
      if (code !== 0) {
        console.log(`rollup_proof exited with unexpected code ${code}.`);
      }
    });

    proc.on('error', console.log);
  }
}
