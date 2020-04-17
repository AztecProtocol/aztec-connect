import { BlockSource, Block } from '.';
import { EventEmitter } from 'events';
import { fetch } from '../iso_fetch';

export class ServerBlockSource extends EventEmitter implements BlockSource {
  private running = true;

  constructor(private host: URL, private lastBlock: number = 0) {
    super();
  }

  public async start() {
    while (this.running) {
      const url = new URL(`/get-blocks`, this.host);
      url.searchParams.append('from', this.lastBlock.toString());

      const response = await fetch(url.toString())
      const blocks: Block[] = await response.json();

      for (const block of blocks) {
        this.emit('block', block);
        this.lastBlock = block.blockNum;
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  public stop() {
    this.running = false;
  }

}