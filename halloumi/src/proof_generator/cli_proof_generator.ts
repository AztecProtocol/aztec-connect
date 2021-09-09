import { readFile, pathExists, mkdirp, rename } from 'fs-extra';
import { fetch } from '@aztec/barretenberg/iso_fetch';
import { ChildProcess, spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { PromiseReadable } from 'promise-readable';
import { createInterface } from 'readline';
import { MemoryFifo } from '@aztec/barretenberg/fifo';
import { ProofGenerator } from './proof_generator';

export class CliProofGenerator implements ProofGenerator {
  private proc?: ChildProcess;
  private stdout: any;
  private runningPromise?: Promise<void>;
  private execQueue = new MemoryFifo<() => Promise<void>>();

  constructor(private maxCircuitSize: number) {
    if (!maxCircuitSize) {
      throw new Error('Rollup sizes must be greater than 0.');
    }
  }

  public async awaitReady() {
    await this.start();
  }

  public async reset() {
    await this.stop();
    await this.start();
  }

  public async getJoinSplitVk() {
    return await readFile('./data/join_split/verification_key');
  }

  public async getAccountVk() {
    return await readFile('./data/account/verification_key');
  }

  public async start() {
    await this.ensureCrs();
    this.launch();
    const initByte = await this.stdout.read(1);
    if (initByte[0] !== 1) {
      throw new Error('Failed to initialize rollup_cli.');
    }
    this.execQueue.process(fn => fn());
    console.log('Proof generator initialized.');
  }

  public async stop() {
    this.execQueue.cancel();
    if (this.proc) {
      this.proc.kill('SIGINT');
      this.proc = undefined;
    }
    if (this.runningPromise) {
      await this.runningPromise;
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

  private async createProofInternal(buffer: Buffer) {
    // this.proc!.stdin!.write(numToUInt32BE(proofId));

    const proofId = buffer.readUInt32BE(0);
    if (proofId == 1)
    {
      // If proofId is a root rollup, compute broadcasted inputs (i.e. former public inputs now SHA256 hashed together) and concatenate with proof!
      this.proc!.stdin!.write(buffer);

      const header = (await this.stdout.read(4)) as Buffer | undefined;
  
      if (!header) {
        throw new Error('Failed to read length.');
      }
  
      const encodedInputsLength = header.readUInt32BE(0);
      const encodedInputs = (await this.stdout.read(encodedInputsLength)) as Buffer | undefined;
      if (!encodedInputs) {
        throw new Error('Failed to read encoded inputs.');
      }  
      const header2 = (await this.stdout.read(4)) as Buffer | undefined;
  
      if (!header2) {
        throw new Error('Failed to read length.');
      }
      const proofLength = header2.readUInt32BE(0);
  
      const data = (await this.stdout.read(proofLength + 1)) as Buffer | undefined;
  
      if (!data) {
        throw new Error('Failed to read data.');
      }
  
      const verified = data.readUInt8(proofLength);
      if (!verified) {
        throw new Error('Proof invalid.');
      }
  
      return Buffer.concat([encodedInputs, data.slice(0, -1)]);  
    }
    else
    {
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
      if (!verified) {
        throw new Error('Proof invalid.');
      }
  
      return data.slice(0, -1);
    }
  }

  public async createProof(data: Buffer) {
    return new Promise<Buffer>((resolve, reject) => {
      const fn = async () => {
        try {
          resolve(await this.createProofInternal(data));
        } catch (err) {
          reject(err);
        }
      };
      this.execQueue.put(fn);
    });
  }

  private async ensureCrs() {
    let required = this.maxCircuitSize;
    const pointPerTranscript = 5040000;
    for (let i = 0; required > 0; i++, required -= pointPerTranscript) {
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
    const out = createWriteStream(`./data/crs/transcript${id}.dat.progress`);
    await new Promise(resolve => {
      out.once('close', resolve);
      (response.body as any).pipe(out);
    });
    await rename(`./data/crs/transcript${id}.dat.progress`, `./data/crs/transcript${id}.dat`);
  }

  private launch() {
    const binPath = '../barretenberg/build/src/aztec/rollup/rollup_cli/rollup_cli';
    const proc = (this.proc = spawn(binPath, ['./data/crs', './data']));
    this.stdout = new PromiseReadable(proc!.stdout!);

    const rl = createInterface({
      input: proc.stderr,
      crlfDelay: Infinity,
    });
    rl.on('line', (line: string) => console.log('rollup_cli: ' + line.trim()));

    this.runningPromise = new Promise(resolve => {
      proc.on('close', (code, signal) => {
        this.proc = undefined;
        if (code !== 0) {
          console.log(`rollup_cli exited with code or signal: ${code || signal}.`);
        }
        resolve();
      });
    });

    proc.on('error', console.log);
  }
}
