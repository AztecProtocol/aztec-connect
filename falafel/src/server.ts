import { Block } from 'barretenberg/block_source';
import { JoinSplitProof, JoinSplitVerifier } from 'barretenberg/client_proofs/join_split_proof';
import { Crs } from 'barretenberg/crs';
import { HashPath } from 'barretenberg/merkle_tree';
import { Proof } from 'barretenberg/rollup_provider';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { BarretenbergWorker } from 'barretenberg/wasm/worker';
import { createWorker, destroyWorker } from 'barretenberg/wasm/worker_factory';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import moment, { Duration } from 'moment';
import { createConnection } from 'typeorm';
import { LocalBlockchain } from './blockchain';
import { MemoryFifo } from './fifo';
import { readFileAsync } from './fs_async';
import { ProofGenerator } from './proof_generator';
import { Rollup } from './rollup';
import { RollupDb } from './rollup_db';
import { WorldStateDb } from './world_state_db';

interface ServerConfig {
  readonly rollupSize: number;
  readonly maxRollupWaitTime: Duration;
  readonly minRollupInterval: Duration;
}

export class Server {
  private worldStateDb: WorldStateDb;
  private joinSplitVerifier!: JoinSplitVerifier;
  private blockchain!: LocalBlockchain;
  private worker!: BarretenbergWorker;
  private rollupDb!: RollupDb;
  private rollupQueue = new MemoryFifo<JoinSplitProof[]>();
  private txQueue = new MemoryFifo<JoinSplitProof | undefined>();
  private proofGenerator: ProofGenerator;
  private pendingNullifiers = new Set<bigint>();

  constructor(private config: ServerConfig) {
    if (!this.config.rollupSize) {
      throw new Error('Rollup size must be greater than 0.');
    }
    this.worldStateDb = new WorldStateDb();
    this.proofGenerator = new ProofGenerator(this.config.rollupSize);
  }

  public async start() {
    await this.proofGenerator.run();
    const connection = await createConnection();
    this.blockchain = new LocalBlockchain(connection, this.config.rollupSize);
    this.rollupDb = new RollupDb(connection);
    await this.blockchain.start();
    await this.rollupDb.init();
    await this.worldStateDb.start();
    this.printState();
    await this.createJoinSplitVerifier();
    const newBlocks = this.getBlocks((await this.rollupDb.getLastBlockNum()) + 1);
    for (const block of newBlocks) {
      await this.handleNewBlock(block);
    }
    this.blockchain.on('block', b => this.handleNewBlock(b));
    this.processTxQueue(this.config.maxRollupWaitTime, this.config.minRollupInterval);
    this.processRollupQueue();
  }

  public stop() {
    this.blockchain.stop();
    this.proofGenerator.cancel();
    this.rollupQueue.cancel();
    this.txQueue.cancel();
    destroyWorker(this.worker);
  }

  private printState() {
    console.log(`Data size: ${this.worldStateDb.getSize(0)}`);
    console.log(`Data root: ${this.worldStateDb.getRoot(0).toString('hex')}`);
    console.log(`Null root: ${this.worldStateDb.getRoot(1).toString('hex')}`);
    console.log(`Root root: ${this.worldStateDb.getRoot(2).toString('hex')}`);
  }

  public status() {
    return {
      dataSize: Number(this.worldStateDb.getSize(0)),
      dataRoot: this.worldStateDb.getRoot(0).toString('hex'),
      nullRoot: this.worldStateDb.getRoot(1).toString('hex'),
      rootRoot: this.worldStateDb.getRoot(2).toString('hex'),
    };
  }

  private async processTxQueue(maxRollupWaitTime: Duration, minRollupInterval: Duration) {
    let flushTimeout!: NodeJS.Timeout;
    let lastTxReceivedTime = moment.unix(0);
    let txs: JoinSplitProof[] = [];

    if (minRollupInterval.asSeconds() > maxRollupWaitTime.asSeconds()) {
      throw new Error('minRollupInterval must be <= maxRollupWaitTime');
    }

    while (true) {
      const tx = await this.txQueue.get();
      if (tx === null) {
        break;
      }

      if (tx) {
        txs.push(tx);
        if (txs.length < this.config.rollupSize && this.txQueue.length() > 0) {
          continue;
        }
      }

      clearTimeout(flushTimeout);
      flushTimeout = setTimeout(() => this.flushTxs(), maxRollupWaitTime.asMilliseconds());

      const shouldRollup =
        txs.length &&
        (tx === undefined ||
          txs.length === this.config.rollupSize ||
          lastTxReceivedTime.isBefore(moment().subtract(maxRollupWaitTime)));

      if (tx) {
        lastTxReceivedTime = moment();
      }

      if (shouldRollup) {
        const rollupTxs = txs;
        txs = [];
        this.rollupQueue.put(rollupTxs);

        // Throttle.
        await new Promise(resolve => setTimeout(resolve, minRollupInterval.asMilliseconds()));
      }
    }

    clearInterval(flushTimeout);
  }

  private async processRollupQueue() {
    while (true) {
      const txs = await this.rollupQueue.get();
      if (!txs) {
        break;
      }

      console.log(`Creating rollup with ${txs.length} txs...`);
      const rollup = await this.createRollup(txs);
      await this.rollupDb.deleteRollup(rollup.rollupId);
      await this.rollupDb.addRollup(rollup);

      try {
        const proof = await this.proofGenerator.createProof(rollup);
        if (!proof) {
          throw new Error('Invalid proof.');
        }

        const viewingKeys = txs.map(tx => tx.viewingKeys).flat();
        await this.blockchain.sendProof(proof, rollup.rollupId, this.config.rollupSize, viewingKeys);
        await this.worldStateDb.commit();
        this.printState();
      } catch (err) {
        console.log(err.message);
        await this.worldStateDb.rollback();
        await this.rollupDb.deleteRollup(rollup.rollupId);
      }
    }
  }

  private async handleNewBlock(block: Block) {
    console.log(`Block received: ${block.blockNum}`);
    await this.rollupDb.confirmRollup(block.blockNum, block.rollupId);
    console.log(`Confirmed rollup: ${block.rollupId}`);
  }

  public getBlocks(from: number) {
    return this.blockchain.getBlocks(from);
  }

  private async createJoinSplitVerifier() {
    const crs = new Crs(0);
    await crs.downloadG2Data();

    const barretenberg = await BarretenbergWasm.new();
    this.worker = await createWorker('0', barretenberg.module);

    const key = await readFileAsync('./data/join_split/verification_key');

    this.joinSplitVerifier = new JoinSplitVerifier();
    await this.joinSplitVerifier.loadKey(this.worker, key, crs.getG2Data());
  }

  public async receiveTx({ proofData, viewingKeys }: Proof) {
    const proof = new JoinSplitProof(proofData, viewingKeys);
    const nullifier1 = toBigIntBE(proof.nullifier1);
    const nullifier2 = toBigIntBE(proof.nullifier2);

    // Check nullifiers don't exist in the db.
    const emptyValue = Buffer.alloc(64, 0);
    const nullifierVal1 = await this.worldStateDb.get(1, nullifier1);
    if (!nullifierVal1.equals(emptyValue)) {
      throw new Error('Nullifier 1 already exists.');
    }
    const nullifierVal2 = await this.worldStateDb.get(1, nullifier2);
    if (!nullifierVal2.equals(emptyValue)) {
      throw new Error('Nullifier 2 already exists.');
    }

    // Check nullifiers don't exist in the pending nullifier set.
    if (this.pendingNullifiers.has(nullifier1) || this.pendingNullifiers.has(nullifier2)) {
      throw new Error('Nullifier already exists in pending nullifier set.');
    }

    // Check the proof is valid.
    if (!(await this.joinSplitVerifier.verifyProof(proofData))) {
      throw new Error('Proof verification failed.');
    }

    // Lookup and save the proofs data root index (for old root support).
    // prettier-ignore
    const emptyDataRoot = Buffer.from([
      0x1d, 0xf6, 0xbd, 0xe5, 0x05, 0x16, 0xdd, 0x12, 0x01, 0x08, 0x8f, 0xd8, 0xdd, 0xa8, 0x4c, 0x97,
      0xed, 0xa5, 0x65, 0x24, 0x28, 0xd1, 0xc7, 0xe8, 0x6a, 0xf5, 0x29, 0xcc, 0x5e, 0x0e, 0xb8, 0x21,
    ]);
    if (!proof.noteTreeRoot.equals(emptyDataRoot)) {
      const rollup = await this.rollupDb.getRollupByDataRoot(proof.noteTreeRoot);
      if (!rollup) {
        throw new Error(`Rollup not found for merkle root: ${proof.noteTreeRoot.toString('hex')}`);
      }
      proof.dataRootsIndex = rollup.id + 1;
    }

    this.pendingNullifiers.add(nullifier1);
    this.pendingNullifiers.add(nullifier2);
    this.txQueue.put(proof);
  }

  public flushTxs() {
    this.txQueue.put(undefined);
  }

  private async createRollup(txs: JoinSplitProof[]) {
    const { rollupSize } = this.config;
    const dataStartIndex = this.worldStateDb.getSize(0);

    // Get old data.
    const oldDataRoot = this.worldStateDb.getRoot(0);
    const oldDataPath = await this.worldStateDb.getHashPath(0, dataStartIndex);
    const oldNullRoot = this.worldStateDb.getRoot(1);
    const dataRootsRoot = this.worldStateDb.getRoot(2);

    // Insert each txs elements into the db (modified state will be thrown away).
    let nextDataIndex = dataStartIndex;
    const newNullRoots: Buffer[] = [];
    const oldNullPaths: HashPath[] = [];
    const newNullPaths: HashPath[] = [];
    const dataRootsPaths: HashPath[] = [];
    const dataRootsIndicies: number[] = [];

    for (const proof of txs) {
      await this.worldStateDb.put(0, nextDataIndex++, proof.newNote1);
      await this.worldStateDb.put(0, nextDataIndex++, proof.newNote2);
      const nullifier1 = toBigIntBE(proof.nullifier1);
      const nullifier2 = toBigIntBE(proof.nullifier2);

      oldNullPaths.push(await this.worldStateDb.getHashPath(1, nullifier1));
      await this.worldStateDb.put(1, nullifier1, toBufferBE(1n, 64));
      newNullRoots.push(this.worldStateDb.getRoot(1));
      newNullPaths.push(await this.worldStateDb.getHashPath(1, nullifier1));

      oldNullPaths.push(await this.worldStateDb.getHashPath(1, nullifier2));
      await this.worldStateDb.put(1, nullifier2, toBufferBE(1n, 64));
      newNullRoots.push(this.worldStateDb.getRoot(1));
      newNullPaths.push(await this.worldStateDb.getHashPath(1, nullifier2));

      dataRootsPaths.push(await this.worldStateDb.getHashPath(2, BigInt(proof.dataRootsIndex)));
      dataRootsIndicies.push(proof.dataRootsIndex);

      this.pendingNullifiers.delete(nullifier1);
      this.pendingNullifiers.delete(nullifier2);
    }

    if (txs.length < rollupSize) {
      this.worldStateDb.put(0, dataStartIndex + BigInt(rollupSize) * 2n - 1n, Buffer.alloc(64, 0));
    }

    // Get new data.
    const newDataPath = await this.worldStateDb.getHashPath(0, dataStartIndex);
    const rollupRootHeight = Math.log2(this.config.rollupSize) + 1;
    const rootIndex = (Number(dataStartIndex) / (this.config.rollupSize * 2)) % 2;
    const rollupRoot = newDataPath.data[rollupRootHeight][rootIndex];
    const newDataRoot = this.worldStateDb.getRoot(0);

    const rootTreeSize = this.worldStateDb.getSize(2);
    await this.worldStateDb.put(2, rootTreeSize, newDataRoot);

    return new Rollup(
      await this.rollupDb.getNextRollupId(),
      Number(dataStartIndex),
      txs.map(tx => tx.proofData),

      rollupRoot,
      oldDataRoot,
      newDataRoot,
      oldDataPath,
      newDataPath,

      oldNullRoot,
      newNullRoots,
      oldNullPaths,
      newNullPaths,

      dataRootsRoot,
      dataRootsPaths,
      dataRootsIndicies,
    );
  }
}
