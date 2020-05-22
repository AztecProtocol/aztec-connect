import { Connection, createConnection } from 'typeorm';
import { Block } from 'barretenberg-es/block_source';
import { BarretenbergWasm } from 'barretenberg/wasm';

import { MemoryFifo } from './fifo';
import { LocalBlockchain } from './blockchain';
import { NoteProcessor } from './NoteProcessor';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { Key } from './entity/key';

export default class Server {
  public connection!: Connection;
  public blockchain!: LocalBlockchain;
  public noteProcessor!: NoteProcessor;
  private blockQueue = new MemoryFifo<Block>();
  public grumpkin!: Grumpkin;

  public async start() {
    this.connection = await createConnection();
    this.blockchain = new LocalBlockchain(this.connection);
    this.noteProcessor = new NoteProcessor();

    await this.blockchain.init();
    await this.noteProcessor.init(this.connection);

    this.blockchain.on('block', b => this.blockQueue.put(b));
    this.processQueue();

    const wasm = await BarretenbergWasm.new();
    this.grumpkin = new Grumpkin(wasm);
  }

  async stop() {
    await this.connection.close();
  }

  private async processQueue() {
    while (true) {
      const block = await this.blockQueue.get();
      if (!block) {
        break;
      }
      this.handleNewBlock(block);
    }
  }

  private async handleNewBlock(block: Block) {
    console.log(`Processing block ${block.blockNum}...`);
    try {
      this.noteProcessor.processNewNotes(block.dataEntries, block.blockNum, false, this.grumpkin);
      this.noteProcessor.processNewNotes(block.nullifiers, block.blockNum, true, this.grumpkin);
    } catch (error) {
      console.log('Error in processing new notes: ', error);
    }
  }

  public async registerNewKey(key: Key) {
    await this.noteProcessor.processNewKey(key, this.grumpkin);
  }
}
