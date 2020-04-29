import { ChildProcess, execSync, spawn } from 'child_process';
import { PromiseReadable } from 'promise-readable';
import { toBufferBE } from 'bigint-buffer';

export class WorldStateDb {
  private proc?: ChildProcess;
  private stdout!: any;

  constructor() {
  }

  public start() {
    this.launch();
  }

  public stop() {
    if (this.proc) {
      this.proc.kill('SIGINT');
    }
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

  public async put(treeId: number, index: bigint, value: Buffer) {
    const buffer = Buffer.alloc(82);
    buffer.writeInt8(1, 0);
    buffer.writeInt8(treeId, 1);
    const indexBuf = toBufferBE(index, 16);
    indexBuf.copy(buffer, 2);
    value.copy(buffer, 18);
    this.proc!.stdin!.write(buffer);

    const result = await this.stdout.read(32);
    return result as Buffer;
  }

  public async destroy() {
    execSync('../barretenberg/build/src/aztec/rollup/db_cli/db_cli reset');
  }

  private launch() {
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

    this.stdout = new PromiseReadable(this.proc!.stdout!);
  }
}
