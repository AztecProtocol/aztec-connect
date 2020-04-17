import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { MemoryFifo } from '../fifo';
import { TxBatch } from './tx_batch';
import { PromiseReadable } from 'promise-readable';

class CancelledError extends Error {}

export class ProofGenerator extends EventEmitter {
  private proc?: ChildProcess;
  private cancelled = false;
  private queue = new MemoryFifo<TxBatch>();

  constructor(private batchSize: number) {
    super();
  }

  public async run() {
    this.launch();

    const stdout = new PromiseReadable(this.proc!.stdout!);

    while (true) {
      try {
        let block = await this.queue.get();
        if (!block) {
          break;
        }
        let buffer = block.toBuffer();
        this.proc!.stdin!.write(buffer);

        const header = await stdout.read(8) as Buffer | undefined;

        if (!header) {
          console.log('Failed to read header.');
          break;
        }

        const blockNum = header.readUInt32BE(0);
        const proofLength = header.readUInt32BE(4);
        const data = await stdout.read(proofLength) as Buffer | undefined;

        if (!data) {
          console.log('Failed to read data.');
          break;
        }

        this.emit('proof', { blockNum, data });
      } catch (err) {
        if (err instanceof CancelledError) {
          console.log('Proof generator cancelled.');
          return;
        }
        console.log('Proof generator failed: ', err);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    console.log('Proof generator thread complete.');
  }

  public cancel() {
    this.cancelled = true;
    this.removeAllListeners();
    if (this.proc) {
      this.proc.kill('SIGINT');
      this.proc = undefined;
    }
  }

  public enqueue(block: TxBatch) {
    this.queue.put(block);
  }

  private launch() {
    const binPath = '../build/src/rollup/prover/rollup_proof';
    const proc = (this.proc = spawn(binPath, [this.batchSize.toString()]));

    // proc.stdout.on('data', data => console.log(data.toString().trim()));
    proc.stderr.on('data', data => console.log(data.toString().trim()));
    proc.on('close', code => {
      this.proc = undefined;
      if (code !== 0) {
        console.log(`rollup_proof exited with unexpected code ${code}.`);
      }
    });

    proc.on('error', console.log);
  }
}
