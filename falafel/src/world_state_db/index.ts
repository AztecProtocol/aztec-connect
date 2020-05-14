import { HashPath } from 'barretenberg/merkle_tree';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { ChildProcess, execSync, spawn } from 'child_process';
import { PromiseReadable } from 'promise-readable';

export class WorldStateDb {
  private proc?: ChildProcess;
  private stdout!: { read: (size: number) => Promise<Buffer> };
  private roots: Buffer[] = [];
  private sizes: bigint[] = [];

  public async start() {
    await this.launch();
  }

  public stop() {
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

  public async get(treeId: number, index: bigint) {
    const buffer = Buffer.alloc(18);
    buffer.writeInt8(0, 0);
    buffer.writeInt8(treeId, 1);
    const indexBuf = toBufferBE(index, 16);
    indexBuf.copy(buffer, 2);
    this.proc!.stdin!.write(buffer);

    const result = await this.stdout.read(64);
    return result as Buffer;
  }

  public async getHashPath(treeId: number, index: bigint) {
    const buffer = Buffer.alloc(18);
    buffer.writeInt8(4, 0);
    buffer.writeInt8(treeId, 1);
    const indexBuf = toBufferBE(index, 16);
    indexBuf.copy(buffer, 2);
    this.proc!.stdin!.write(buffer);

    const depth = (await this.stdout.read(4)).readUInt32BE(0);
    const result = await this.stdout.read(depth * 64);

    const path = new HashPath();
    for (let i=0; i<depth; ++i) {
      const lhs = result.slice(i*64, i*64+32);
      const rhs = result.slice(i*64+32, i*64+64);
      path.data.push([lhs, rhs]);
    }
    return path;
  }

  public async put(treeId: number, index: bigint, value: Buffer) {
    const buffer = Buffer.alloc(82);
    buffer.writeInt8(1, 0);
    buffer.writeInt8(treeId, 1);
    const indexBuf = toBufferBE(index, 16);
    indexBuf.copy(buffer, 2);
    value.copy(buffer, 18);
    this.proc!.stdin!.write(buffer);

    this.roots[treeId] = await this.stdout.read(32);

    if (index + 1n > this.sizes[treeId]) {
      this.sizes[treeId] = index + 1n;
    }

    return this.roots[treeId];
  }

  public async commit() {
    const buffer = Buffer.from([0x02]);
    this.proc!.stdin!.write(buffer);
    await this.readMetadata();
  }

  public async rollback() {
    const buffer = Buffer.from([0x03]);
    this.proc!.stdin!.write(buffer);
    await this.readMetadata();
  }

  public async destroy() {
    execSync('../barretenberg/build/src/aztec/rollup/db_cli/db_cli reset');
  }

  private async launch() {
    const binPath = '../barretenberg/build/src/aztec/rollup/db_cli/db_cli';
    const proc = (this.proc = spawn(binPath));

    proc.stderr.on('data', data => {});
    // proc.stderr.on('data', data => console.log(data.toString().trim()));
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
    const dataSize = await this.stdout.read(16);
    const nullifierSize = await this.stdout.read(16);
    this.sizes[0] = toBigIntBE(dataSize);
    this.sizes[1] = toBigIntBE(nullifierSize);
  }
}
