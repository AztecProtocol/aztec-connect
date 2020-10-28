import { MemoryFifo } from '../fifo';
import { mkdirp } from 'fs-extra';
import { HashPath } from '../merkle_tree';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { ChildProcess, execSync, spawn } from 'child_process';
import { PromiseReadable } from 'promise-readable';

export class WorldStateDb {
  private proc?: ChildProcess;
  private stdout!: { read: (size: number) => Promise<Buffer> };
  private stdioQueue = new MemoryFifo<() => Promise<void>>();
  private roots: Buffer[] = [];
  private sizes: bigint[] = [];
  private binPath = '../barretenberg/build/src/aztec/rollup/db_cli/db_cli';

  constructor(private dbPath: string = './data/world_state.db') {}

  public async start() {
    await this.launch();
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

  public async get(treeId: number, index: bigint): Promise<Buffer> {
    return new Promise(resolve => this.stdioQueue.put(async () => resolve(await this.get_(treeId, index))));
  }

  private async get_(treeId: number, index: bigint) {
    const buffer = Buffer.alloc(18);
    buffer.writeInt8(0, 0);
    buffer.writeInt8(treeId, 1);
    const indexBuf = toBufferBE(index, 16);
    indexBuf.copy(buffer, 2);

    this.proc!.stdin!.write(buffer);

    const lengthBuf = await this.stdout.read(4);
    if (!lengthBuf) {
      throw new Error('Failed to read length.');
    }

    const length = lengthBuf.readUInt32BE(0);

    const result = await this.stdout.read(length);

    return result;
  }

  public async getHashPath(treeId: number, index: bigint): Promise<HashPath> {
    return new Promise(resolve => this.stdioQueue.put(async () => resolve(await this.getHashPath_(treeId, index))));
  }

  private async getHashPath_(treeId: number, index: bigint) {
    const buffer = Buffer.alloc(18);
    buffer.writeInt8(4, 0);
    buffer.writeInt8(treeId, 1);
    const indexBuf = toBufferBE(index, 16);
    indexBuf.copy(buffer, 2);

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

  public async put(treeId: number, index: bigint, value: Buffer): Promise<Buffer> {
    return new Promise(resolve => this.stdioQueue.put(async () => resolve(await this.put_(treeId, index, value))));
  }

  private async put_(treeId: number, index: bigint, value: Buffer) {
    const buffer = Buffer.alloc(22);
    buffer.writeInt8(1, 0);
    buffer.writeInt8(treeId, 1);
    const indexBuf = toBufferBE(index, 16);
    indexBuf.copy(buffer, 2);
    buffer.writeUInt32BE(value.length, 18);

    this.proc!.stdin!.write(Buffer.concat([buffer, value]));

    this.roots[treeId] = await this.stdout.read(32);

    if (index + BigInt(1) > this.sizes[treeId]) {
      this.sizes[treeId] = index + BigInt(1);
    }

    return this.roots[treeId];
  }

  public async commit() {
    await new Promise(resolve => {
      this.stdioQueue.put(async () => {
        const buffer = Buffer.from([0x02]);
        this.proc!.stdin!.write(buffer);
        await this.readMetadata();
        resolve();
      });
    });
  }

  public async rollback() {
    await new Promise(resolve => {
      this.stdioQueue.put(async () => {
        const buffer = Buffer.from([0x03]);
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

    proc.stderr.on('data', data => {});
    proc.on('close', code => {
      this.proc = undefined;
      if (code) {
        console.log(`db_cli exited with unexpected code ${code}.`);
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
    const dataSize = await this.stdout.read(16);
    const nullifierSize = await this.stdout.read(16);
    const rootSize = await this.stdout.read(16);
    this.sizes[0] = toBigIntBE(dataSize);
    this.sizes[1] = toBigIntBE(nullifierSize);
    this.sizes[2] = toBigIntBE(rootSize);
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
