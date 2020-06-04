import { EventEmitter } from 'events';

import { Block } from 'barretenberg/block_source';
import { Schnorr } from 'barretenberg/crypto/schnorr';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { Connection, createConnection } from 'typeorm';

import { ormConfig } from '../ormconfig';
import { LocalBlockchain } from './blockchain';
import { KeyDb } from './db/key';
import { NoteDb } from './db/note';
import { SignatureDb } from './db/signature';
import { MemoryFifo } from './fifo';
import { NoteProcessor } from './note-processor';

export default class Server extends EventEmitter {
    private blockQueue = new MemoryFifo<Block>();
    private connection!: Connection;

    public keyDb!: KeyDb;
    public noteDb!: NoteDb;
    public signatureDb!: SignatureDb;
    public blockchain!: LocalBlockchain;
    public noteProcessor!: NoteProcessor;
    public grumpkin!: Grumpkin;
    public schnorr!: Schnorr;

    public async start() {
        this.connection = await createConnection(ormConfig);

        const wasm = await BarretenbergWasm.new();
        await wasm.init();
        this.grumpkin = new Grumpkin(wasm);
        this.schnorr = new Schnorr(wasm);

        this.keyDb = new KeyDb(this.connection);
        await this.keyDb.init();

        this.noteDb = new NoteDb(this.connection);
        await this.noteDb.init();

        this.signatureDb = new SignatureDb(this.connection);
        await this.signatureDb.init();

        this.blockchain = new LocalBlockchain(this.connection);
        this.noteProcessor = new NoteProcessor();

        await this.noteProcessor.init(this.connection, this.grumpkin, this.keyDb);
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
            await this.noteProcessor.processNewNotes(block.dataEntries, block.blockNum, false);
            await this.noteProcessor.processNewNotes(block.nullifiers, block.blockNum, true);
            this.emit('block-processed', block);
        } catch (error) {
            console.log('Error in processing new notes: ', error);
        }
    }

    public async registerNewKey(informationKey: string) {
        await this.noteProcessor.processNewKey(informationKey);
    }
}
