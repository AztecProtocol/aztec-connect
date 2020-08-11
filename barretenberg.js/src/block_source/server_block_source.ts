import { BlockSource, Block } from '.';
import { EventEmitter } from 'events';
import { fetch } from '../iso_fetch';
import createDebug from 'debug';

const debug = createDebug('bb:server_block_source');

export class ServerBlockSource extends EventEmitter implements BlockSource {
  private running = false;

  constructor(private host: URL) {
    super();
  }

  public async start(fromBlock: number = 0) {
    this.running = true;

    while (this.running) {
      try {
        const url = new URL(`/api/get-blocks`, this.host);
        url.searchParams.append('from', fromBlock.toString());

        const response = await fetch(url.toString());
        const jsonBlocks = await response.json();

        const blocks = jsonBlocks.map(
          ({ dataRoot, nullRoot, dataEntries, nullifiers, viewingKeys, ...rest }) =>
            ({
              ...rest,
              dataRoot: Buffer.from(dataRoot),
              nullRoot: Buffer.from(nullRoot),
              dataEntries: dataEntries.map(str => Buffer.from(str, 'hex')),
              nullifiers: nullifiers.map(str => Buffer.from(str, 'hex')),
              viewingKeys: viewingKeys.map(str => Buffer.from(str, 'hex')),
            } as Block),
        );

        for (const block of blocks) {
          this.emit('block', block);
          fromBlock = block.blockNum + 1;
        }
      } catch (err) {
        // debug(err);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public stop() {
    this.running = false;
  }
}
