import { Block } from 'barretenberg/block_source';
import { Schnorr } from 'barretenberg/crypto/schnorr';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { Connection, createConnection } from 'typeorm';


import { LocalBlockchain } from './blockchain';
import { BlockDao } from './entity/block';
import { Key } from './entity/key';
import { Note } from './entity/note';
import { MemoryFifo } from './fifo';
import { NoteProcessor } from './note-processor';

export default class Server {
  public connection!: Connection;
  public blockchain!: LocalBlockchain;
  public noteProcessor!: NoteProcessor;
  private blockQueue = new MemoryFifo<Block>();
  public grumpkin!: Grumpkin;
  public schnorr!: Schnorr;

  public async start() {
    this.connection = await createConnection({
      type: 'sqlite',
      database: 'db.sqlite',
      synchronize: true,
      logging: false,
      entities: [Key, BlockDao, Note],
    });

    const wasm = await BarretenbergWasm.new();
    await wasm.init();
    this.grumpkin = new Grumpkin(wasm);
    this.schnorr = new Schnorr(wasm);

    this.blockchain = new LocalBlockchain(this.connection);
    this.noteProcessor = new NoteProcessor();

    await this.noteProcessor.init(this.connection, this.grumpkin);
    await this.blockchain.init();

    this.blockchain.on('block', b => this.blockQueue.put(b));
    this.processQueue();
  }

  public async stop() {
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
      this.noteProcessor.processNewNotes(block.dataEntries, block.blockNum, false);
      this.noteProcessor.processNewNotes(block.nullifiers, block.blockNum, true);
    } catch (error) {
      console.log('Error in processing new notes: ', error);
    }
  }

  public async registerNewKey(key: Key) {
    await this.noteProcessor.processNewKey(key);
  }
}
