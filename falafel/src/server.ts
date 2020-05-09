import { Block } from 'barretenberg/block_source';
import { JoinSplitProof, JoinSplitVerifier } from 'barretenberg/client_proofs/join_split_proof';
import { Crs } from 'barretenberg/crs';
import { SinglePippenger } from 'barretenberg/pippenger';
import { Proof } from 'barretenberg/rollup_provider';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { BarretenbergWorker } from 'barretenberg/wasm/worker';
import { createWorker, destroyWorker } from 'barretenberg/wasm/worker_factory';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { createConnection } from 'typeorm';
import { LocalBlockchain } from './blockchain';
import { MemoryFifo } from './fifo';
import { IndexedHashPath, Rollup } from './rollup';
import { RollupDb } from './rollup_db';
import { WorldStateDb } from './world_state_db';

export class Server {
  private interval?: NodeJS.Timer;
  private worldStateDb: WorldStateDb;
  private maxBlockInterval = 600 * 1000;
  private joinSplitVerifier!: JoinSplitVerifier;
  private blockchain!: LocalBlockchain;
  private worker!: BarretenbergWorker;
  private rollupDb!: RollupDb;
  private queue = new MemoryFifo<() => void>();
  private txPool: JoinSplitProof[] = [];

  constructor(private rollupSize: number) {
    this.worldStateDb = new WorldStateDb();
  }

  public async start() {
    const connection = await createConnection();
    this.blockchain = new LocalBlockchain(connection);
    this.rollupDb = new RollupDb(connection);
    await this.blockchain.init();
    await this.rollupDb.init();
    await this.worldStateDb.start();
    this.printState();
    await this.createJoinSplitVerifier();
    this.interval = setInterval(() => this.flushTxs(), this.maxBlockInterval);
    this.blockchain.on('block', b => this.queue.put(() => this.handleNewBlock(b)));
    this.processQueue();
  }

  public stop() {
    this.queue.cancel();
    clearInterval(this.interval!);
    destroyWorker(this.worker);
  }

  private printState() {
    console.log(`Data size: ${this.worldStateDb.getSize(0)}`);
    console.log(`Data root: ${this.worldStateDb.getRoot(0).toString('hex')}`);
    console.log(`Null root: ${this.worldStateDb.getRoot(1).toString('hex')}`);
  }

  public status() {
    return {
      dataSize: Number(this.worldStateDb.getSize(0)),
      dataRoot: this.worldStateDb.getRoot(0).toString('hex'),
      nullRoot: this.worldStateDb.getRoot(1).toString('hex'),
    };
  }

  private async processQueue() {
    while (true) {
      const f = await this.queue.get();
      if (!f) {
        break;
      }
      f();
    }
  }

  private async handleNewBlock(block: Block) {
    console.log(`Processing block ${block.blockNum}...`);

    for (let i = 0; i < block.dataEntries.length; ++i) {
      await this.worldStateDb.put(0, BigInt(block.dataStartIndex + i), block.dataEntries[i]);
    }

    const nullifierValue = Buffer.alloc(64, 0);
    nullifierValue.writeUInt8(1, 63);
    for (const nullifier of block.nullifiers) {
      await this.worldStateDb.put(1, toBigIntBE(nullifier), nullifierValue);
    }

    await this.worldStateDb.commit();
    this.printState();

    // TODO: Confirm rollup by adding eth block and tx hash.
    // await this.rollupDb.confirm(block);
  }

  public getBlocks(from: number) {
    return this.blockchain.getBlocks(from);
  }

  private async createJoinSplitVerifier() {
    console.log('Generating keys...');
    const circuitSize = 128 * 1024;

    const crs = new Crs(circuitSize);
    await crs.download();

    const barretenberg = await BarretenbergWasm.new();
    this.worker = await createWorker('0', barretenberg.module);

    const pippenger = new SinglePippenger(this.worker);
    await pippenger.init(crs.getData());

    // We need to init the proving key to create the verification key...
    await this.worker.call('join_split__init_proving_key');

    this.joinSplitVerifier = new JoinSplitVerifier(pippenger);
    await this.joinSplitVerifier.init(crs.getG2Data());

    console.log('Done.');
  }

  public async receiveTx({proofData, encViewingKey1, encViewingKey2}: Proof) {
    const proof = new JoinSplitProof(proofData, [encViewingKey1, encViewingKey2]);

    // Check nullifiers don't exist (tree id 1 returns 0 at index).
    const emptyValue = Buffer.alloc(64, 0);
    const nullifierVal1 = await this.worldStateDb.get(1, proof.nullifier1);
    if (!nullifierVal1.equals(emptyValue)) {
      throw new Error('Nullifier 1 already exists.');
    }
    const nullifierVal2 = await this.worldStateDb.get(1, proof.nullifier2);
    if (!nullifierVal2.equals(emptyValue)) {
      throw new Error('Nullifier 2 already exists.');
    }

    if (!proof.noteTreeRoot.equals(this.worldStateDb.getRoot(0))) {
      throw new Error('Merkle roots do not match.');
    }

    if (!(await this.joinSplitVerifier.verifyProof(proofData))) {
      throw new Error('Proof verification failed.');
    }

    this.addToPool(proof);
  }

  private async createIndexedHashPaths(txs: JoinSplitProof[]) {
    const dataPaths: IndexedHashPath[] = [];
    const nullPaths: IndexedHashPath[] = [];

    let nextDataIndex = this.worldStateDb.getSize(0);
    for (const proof of txs) {
      const dataPath1 = await this.worldStateDb.getHashPath(0, nextDataIndex);
      // As txs always are pairs of notes (first even index, second odd index), we know hash paths will be the same.
      const dataPath2 = dataPath1;
      const nullPath1 = await this.worldStateDb.getHashPath(0, proof.nullifier1);
      const nullPath2 = await this.worldStateDb.getHashPath(0, proof.nullifier2);
      dataPaths.push(new IndexedHashPath(nextDataIndex++, dataPath1));
      dataPaths.push(new IndexedHashPath(nextDataIndex++, dataPath2));
      nullPaths.push(new IndexedHashPath(proof.nullifier1, nullPath1));
      nullPaths.push(new IndexedHashPath(proof.nullifier2, nullPath2));
    }

    return {dataPaths, nullPaths};
  }

  private async createRollup(txs: JoinSplitProof[]) {
    // Get old data.
    const oldDataRoot = this.worldStateDb.getRoot(0);
    const oldNullRoot = this.worldStateDb.getRoot(1);
    const {dataPaths: oldDataPaths, nullPaths: oldNullPaths} = await this.createIndexedHashPaths(txs);

    // Insert each txs element into the tree (will be thrown away).
    let nextDataIndex = this.worldStateDb.getSize(0);
    for (const proof of txs) {
      this.worldStateDb.put(0, nextDataIndex++, proof.newNote1);
      this.worldStateDb.put(0, nextDataIndex++, proof.newNote2);
      this.worldStateDb.put(1, proof.nullifier1, toBufferBE(1n, 64));
      this.worldStateDb.put(1, proof.nullifier2, toBufferBE(1n, 64));
    }

    // Get new data.
    const newDataRoot = this.worldStateDb.getRoot(0);
    const newNullRoot = this.worldStateDb.getRoot(1);
    const {dataPaths: newDataPaths, nullPaths: newNullPaths} = await this.createIndexedHashPaths(txs);

    // Discard changes.
    // TODO: WARNING! ROOTS AND SIZE ARE NOT RESTORED. FIX!
    await this.worldStateDb.rollback();

    return new Rollup(
      this.rollupDb.getNextRollupId(),
      txs.map(tx=>tx.proofData),
      oldDataRoot,
      oldNullRoot,
      oldDataPaths,
      oldNullPaths,
      newDataRoot,
      newNullRoot,
      newDataPaths,
      newNullPaths
    );
  }

  private addToPool(proof: JoinSplitProof) {
    this.txPool.push(proof);
    if (this.txPool.length >= this.rollupSize) {
      this.flushTxs();
    }
  }

  private async rollup(txs: JoinSplitProof[]) {
    const rollup = await this.createRollup(txs);

    await this.rollupDb.addRollup(rollup);

    // For now, just the first tx is considered.
    this.blockchain.sendProof(txs[0].proofData, rollup.rollupId, txs[0].viewingKeys);
  }

  public flushTxs() {
    this.queue.put(() => this.rollup(this.txPool));
    this.txPool = [];
  }
}
