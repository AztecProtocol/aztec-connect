import { fetch } from '@aztec/barretenberg/iso_fetch';
import { ChildProcess, spawn } from 'child_process';
import { PromiseReadable } from 'promise-readable';
import { createInterface } from 'readline';
import { MemoryFifo } from '@aztec/barretenberg/fifo';
import { ProofGenerator } from './proof_generator.js';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import fs from 'fs-extra';
const { unlink, writeFile, pathExists, mkdirp, rename } = fs;

enum CommandCodes {
  GET_JOIN_SPLIT_VK = 100,
  GET_ACCOUNT_VK = 101,
  PING = 666,
}

export class CliProofGenerator implements ProofGenerator {
  private proc?: ChildProcess;
  private stdout: any;
  private runningPromise?: Promise<void>;
  private binaryPromise?: Promise<void>;
  private execQueue = new MemoryFifo<() => Promise<void>>();

  constructor(
    private maxCircuitSize: number,
    private txsPerInner: number,
    private innersPerRoot: number,
    private proverless: boolean,
    private lazyInit: boolean,
    private persist: boolean,
    private dataDir: string,
  ) {
    if (!maxCircuitSize) {
      throw new Error('Rollup sizes must be greater than 0.');
    }

    if (!innersPerRoot) {
      throw new Error('No inner rollup count provided.');
    }
  }

  public async reset() {
    await this.stop();
    await this.start();
  }

  private async readVector() {
    const length = (await this.stdout.read(4)) as Buffer | undefined;

    if (!length) {
      throw new Error('Failed to read length.');
    }

    const vectorLen = length.readUInt32BE(0);

    if (vectorLen === 0) {
      return Buffer.alloc(0);
    }

    const data = (await this.stdout.read(vectorLen)) as Buffer | undefined;

    if (!data) {
      throw new Error('Failed to read data.');
    }

    return data;
  }

  public getJoinSplitVk() {
    return this.serialExecute(() => {
      this.proc!.stdin!.write(numToUInt32BE(CommandCodes.GET_JOIN_SPLIT_VK));
      return this.readVector();
    });
  }

  public getAccountVk() {
    return this.serialExecute(() => {
      this.proc!.stdin!.write(numToUInt32BE(CommandCodes.GET_ACCOUNT_VK));
      return this.readVector();
    });
  }

  public async start() {
    this.execQueue = new MemoryFifo<() => Promise<void>>();

    await this.ensureCrs();
    this.launch();

    console.log('Waiting for rollup_cli to bootstrap...');
    this.proc!.stdin!.write(numToUInt32BE(CommandCodes.PING));

    const initByte = await this.stdout.read(1);
    if (!initByte || initByte[0] !== 1) {
      throw new Error('Failed to initialize rollup_cli.');
    }

    this.runningPromise = this.execQueue.process(fn => fn());
    console.log('Proof generator initialized.');
  }

  public async stop() {
    this.execQueue.cancel();
    if (this.proc) {
      this.proc.kill('SIGINT');
      this.proc = undefined;
    }
    if (this.binaryPromise) {
      await this.binaryPromise;
    }
    if (this.runningPromise) {
      await this.runningPromise;
    }
  }

  /**
   * TODO: Should signal to the rollup_cli to stop what it's doing and await new work.
   * This will require the rollup_cli to fork a child process after producing required proving keys.
   */
  public async interrupt() {}

  private async createProofInternal(buffer: Buffer) {
    this.proc!.stdin!.write(buffer);
    const data = await this.readVector();
    const verified = (await this.stdout.read(1)) as Buffer | undefined;

    if (!verified) {
      throw new Error('Failed to read verified.');
    }

    if (!verified[0]) {
      throw new Error('Proof invalid.');
    }

    return data;
  }

  private serialExecute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.execQueue.put(async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  public createProof(data: Buffer) {
    return this.serialExecute(() => this.createProofInternal(data));
  }

  private async ensureCrs() {
    const pointPerTranscript = 5040000;

    if (this.maxCircuitSize < pointPerTranscript) {
      await this.getPartialTranscript0();
      return;
    }

    for (let i = 0, fetched = 0; fetched < this.maxCircuitSize; ) {
      try {
        await this.downloadTranscript(i);
        ++i;
        fetched += pointPerTranscript;
      } catch (err: any) {
        console.log('Failed to download transcript, will retry: ', err);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async downloadTranscript(n: number) {
    const id = String(n).padStart(2, '0');
    if (await pathExists(`./data/crs/transcript${id}.dat.partial`)) {
      await unlink(`./data/crs/transcript${id}.dat`);
      await unlink(`./data/crs/transcript${id}.dat.partial`);
    }
    if (await pathExists(`./data/crs/transcript${id}.dat`)) {
      return;
    }
    console.log(`Downloading crs: transcript${id}.dat...`);
    await mkdirp('./data/crs');
    const response = await fetch(`http://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/sealed/transcript${id}.dat`);
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const data = await (response as any).buffer();
    await writeFile(`./data/crs/transcript${id}.dat.progress`, data);
    await rename(`./data/crs/transcript${id}.dat.progress`, `./data/crs/transcript${id}.dat`);
  }

  /**
   * Slower connections don't want to have to download 300+MB just to run in proverless mode.
   * This is a bit of a hack but produces a transcript with just the right number of points.
   * We track that it's "partial" with a file, so if we require more points we can easily detect and delete it.
   */
  private async getPartialTranscript0() {
    const pointPerTranscript = 5040000;

    console.log(`Downloading ${this.maxCircuitSize} points from transcript00.dat...`);

    // We need (circuitSize + 1) number of g1 points.
    const g1End = 28 + (this.maxCircuitSize + 1) * 64;

    // Download required range of data.
    const response = await fetch('https://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/sealed/transcript00.dat', {
      headers: {
        Range: `bytes=0-${g1End - 1}`,
      },
    });

    const g1Data = new Uint8Array(await response.arrayBuffer());

    const g2Start = 28 + pointPerTranscript * 64;

    const response2 = await fetch('https://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/sealed/transcript00.dat', {
      headers: {
        Range: `bytes=${g2Start}-`,
      },
    });

    const g2Data = new Uint8Array(await response2.arrayBuffer());

    const partialTranscript = Buffer.concat([g1Data, Buffer.alloc(g2Start - g1End), g2Data]);

    await mkdirp('./data/crs');
    await writeFile(`./data/crs/transcript00.dat.progress`, partialTranscript);
    await writeFile(`./data/crs/transcript00.dat.partial`, Buffer.alloc(0));
    await rename(`./data/crs/transcript00.dat.progress`, `./data/crs/transcript00.dat`);
  }

  private launch() {
    const binPath = '../../aztec-connect-cpp/build/bin/rollup_cli';
    const binArgs = [
      './data/crs',
      this.txsPerInner.toString(),
      this.innersPerRoot.toString(),
      this.proverless.toString(),
      this.lazyInit.toString(),
      this.persist.toString(),
      this.dataDir,
    ];

    const proc = (this.proc = spawn(binPath, binArgs));
    this.stdout = new PromiseReadable(proc!.stdout!);

    const rl = createInterface({
      input: proc.stderr,
      crlfDelay: Infinity,
    });
    rl.on('line', (line: string) => console.log('rollup_cli: ' + line.trim()));

    this.binaryPromise = new Promise(resolve => {
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
