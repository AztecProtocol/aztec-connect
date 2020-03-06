import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { MemoryFifo } from './fifo';
import { Block } from './block';

class CancelledError extends Error {}

export class ProofGenerator extends EventEmitter {
  private proc?: ChildProcess;
  private cancelled = false;
  private queue = new MemoryFifo<Block>();

  constructor(private batchSize: number) {
    super();
  }

  public async run() {
    this.launch();

    while (true) {
      try {
        let block = await this.queue.get();
        if (!block) {
          break;
        }
        let buffer = block.toBuffer();
        this.proc!.stdin!.write(buffer);
        // let proof = await this.computeProof(block);
        // this.emit('proof', proof);
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

  public enqueue(block: Block) {
    this.queue.put(block);
  }

  private launch() {
    const binPath = '../build/src/rollup/prover/rollup_proof';
    const proc = (this.proc = spawn(binPath, [this.batchSize.toString()]));

    proc.stdout.on('data', data => console.log(data.toString().trim()));
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
