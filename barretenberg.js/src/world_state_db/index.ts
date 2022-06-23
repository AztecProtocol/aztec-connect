import { MemoryFifo } from '../fifo';
import { mkdirp } from 'fs-extra';
import { HashPath } from '../merkle_tree';
import { toBigIntBE, toBufferBE } from '../bigint_buffer';
import { ChildProcess, execSync, spawn } from 'child_process';
import { PromiseReadable } from 'promise-readable';
import { serializeBufferArrayToVector } from '../serialize';

enum Command {
  GET,
  PUT,
  COMMIT,
  ROLLBACK,
  GET_PATH,
  BATCH_PUT,
}

export enum RollupTreeId {
  DATA,
  NULL,
  ROOT,
  DEFI,
}

export interface PutEntry {
  treeId: number;
  index: bigint;
  value: Buffer;
}

export class WorldStateDb {
  private proc?: ChildProcess;
  private stdout!: { read: (size: number) => Promise<Buffer> };
  private stdioQueue = new MemoryFifo<() => Promise<void>>();
  private roots: Buffer[] = [];
  private sizes: bigint[] = [];
  private binPath = '../barretenberg/build/bin/db_cli';

  constructor(private dbPath: string = './data/world_state.db') {}

  public async start() {
    await this.launch();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.processStdioQueue();
  }

  public stop() {
    this.stdioQueue.cancel();
    if (this.proc) {
      this.proc.kill('SIGINT');
    }
  }

  public getRoot(treeId: number) {
    return this.roots[treeId];
  }

  public getSize(treeId: number) {
    return this.sizes[treeId];
  }

  public async getSubtreeRoot(treeId: number, index: bigint, depth: number) {
    const path = await this.getHashPath(treeId, index);

    const hashPair = path.data[depth];
    // figure out whether our root is the lhs or rhs of the hash pair
    const isLeft = (index >> BigInt(depth)) % BigInt(2) == BigInt(0);
    const subTreeRoot = hashPair[isLeft ? 0 : 1];
    return subTreeRoot;
  }

  public get(treeId: number, index: bigint): Promise<Buffer> {
    return new Promise(resolve => this.stdioQueue.put(async () => resolve(await this.get_(treeId, index))));
  }

  private async get_(treeId: number, index: bigint) {
    const buffer = Buffer.concat([Buffer.from([Command.GET, treeId]), toBufferBE(index, 32)]);

    this.proc!.stdin!.write(buffer);

    const result = await this.stdout.read(32);

    return result;
  }

  public getHashPath(treeId: number, index: bigint): Promise<HashPath> {
    return new Promise(resolve => this.stdioQueue.put(async () => resolve(await this.getHashPath_(treeId, index))));
  }

  private async getHashPath_(treeId: number, index: bigint) {
    const buffer = Buffer.concat([Buffer.from([Command.GET_PATH, treeId]), toBufferBE(index, 32)]);

    this.proc!.stdin!.write(buffer);

    const depth = (await this.stdout.read(4)).readUInt32BE(0);
    const result = await this.stdout.read(depth * 64);

    const path = new HashPath();
    for (let i = 0; i < depth; ++i) {
      const lhs = result.slice(i * 64, i * 64 + 32);
      const rhs = result.slice(i * 64 + 32, i * 64 + 64);
      path.data.push([lhs, rhs]);
    }
    return path;
  }

  public put(treeId: number, index: bigint, value: Buffer): Promise<Buffer> {
    if (value.length !== 32) {
      throw Error('Values must be 32 bytes.');
    }
    return new Promise(resolve => this.stdioQueue.put(async () => resolve(await this.put_(treeId, index, value))));
  }

  private async put_(treeId: number, index: bigint, value: Buffer) {
    const buffer = Buffer.concat([Buffer.from([Command.PUT, treeId]), toBufferBE(index, 32), value]);

    this.proc!.stdin!.write(buffer);

    this.roots[treeId] = await this.stdout.read(32);

    if (index + BigInt(1) > this.sizes[treeId]) {
      this.sizes[treeId] = index + BigInt(1);
    }

    return this.roots[treeId];
  }

  public batchPut(entries: PutEntry[]) {
    return new Promise(resolve => this.stdioQueue.put(async () => resolve(await this.batchPut_(entries))));
  }

  private async batchPut_(entries: PutEntry[]) {
    const bufs = entries.map(e => Buffer.concat([Buffer.from([e.treeId]), toBufferBE(e.index, 32), e.value]));
    const buffer = Buffer.concat([Buffer.from([Command.BATCH_PUT]), serializeBufferArrayToVector(bufs)]);

    this.proc!.stdin!.write(buffer);

    await this.readMetadata();
  }

  public async commit() {
    await new Promise<void>(resolve => {
      this.stdioQueue.put(async () => {
        const buffer = Buffer.from([Command.COMMIT]);
        this.proc!.stdin!.write(buffer);
        await this.readMetadata();
        resolve();
      });
    });
  }

  public async rollback() {
    await new Promise<void>(resolve => {
      this.stdioQueue.put(async () => {
        const buffer = Buffer.from([Command.ROLLBACK]);
        this.proc!.stdin!.write(buffer);
        await this.readMetadata();
        resolve();
      });
    });
  }

  public destroy() {
    execSync(`${this.binPath} reset ${this.dbPath}`);
  }

  private async launch() {
    await mkdirp('./data');
    const proc = (this.proc = spawn(this.binPath, [this.dbPath]));

    proc.stderr.on('data', () => {});
    proc.on('close', code => {
      this.proc = undefined;
      if (code) {
        console.log(`db_cli exited with unexpected code ${code}.`);
        // Should never happen, so process termination is the only sensible response.
        process.exit(1);
      }
    });

    proc.on('error', console.log);

    this.stdout = new PromiseReadable(this.proc!.stdout!) as any;

    await this.readMetadata();
  }

  private async readMetadata() {
    this.roots[0] = await this.stdout.read(32);
    this.roots[1] = await this.stdout.read(32);
    this.roots[2] = await this.stdout.read(32);
    this.roots[3] = await this.stdout.read(32);
    const dataSize = await this.stdout.read(32);
    const nullifierSize = await this.stdout.read(32);
    const rootSize = await this.stdout.read(32);
    const defiSize = await this.stdout.read(32);
    this.sizes[0] = toBigIntBE(dataSize);
    this.sizes[1] = toBigIntBE(nullifierSize);
    this.sizes[2] = toBigIntBE(rootSize);
    this.sizes[3] = toBigIntBE(defiSize);
  }

  private async processStdioQueue() {
    while (true) {
      const fn = await this.stdioQueue.get();
      if (!fn) {
        break;
      }

      await fn();
    }
  }
}
