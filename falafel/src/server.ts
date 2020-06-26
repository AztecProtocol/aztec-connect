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

interface PublishQueueItem {
  rollupId: number;
  proof: Buffer;
  viewingKeys: Buffer[];
}

export class Server {
  private worldStateDb: WorldStateDb;
  private joinSplitVerifier!: JoinSplitVerifier;
  private blockchain!: LocalBlockchain;
  private worker!: BarretenbergWorker;
  private rollupDb!: RollupDb;
  private rollupQueue = new MemoryFifo<JoinSplitProof[]>();
  private publishQueue = new MemoryFifo<PublishQueueItem>();
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
    this.rollupDb.init();
    await this.blockchain.start();
    await this.worldStateDb.start();
    this.printState();
    await this.createJoinSplitVerifier();
    await this.restoreState();
    this.processTxQueue(this.config.maxRollupWaitTime, this.config.minRollupInterval);
    this.processRollupQueue();
    this.processPublishQueue();
  }

  public stop() {
    this.blockchain.stop();
    this.proofGenerator.cancel();
    this.publishQueue.cancel();
    this.rollupQueue.cancel();
    this.txQueue.cancel();
    destroyWorker(this.worker);
  }

  private async restoreState() {
    // Ensure we confirm any rollups that we have missed while not running.
    const newBlocks = this.getBlocks((await this.rollupDb.getLastBlockNum()) + 1);
    for (const block of newBlocks) {
      await this.rollupDb.confirmRollup(block.rollupId, block.blockNum);
    }

    // If there is a CREATING rollup, we need to detect if it's been committed.
    //    If the world state db root matches the newRoot of the rollup, set it to CREATED.
    //    Else remove CREATING rollups.
    const pendingRollups = await this.rollupDb.getPendingRollups();
    if (pendingRollups.length) {
      const dataRoot = await this.worldStateDb.getRoot(0);
      const lastCommittedIndex = pendingRollups.findIndex(r => r.dataRoot.equals(dataRoot));
      for (let i = 0; i < lastCommittedIndex + 1; ++i) {
        await this.rollupDb.confirmRollupCreated(pendingRollups[i].id);
      }
      await this.rollupDb.deletePendingRollups();
    }

    // Find all CREATED rollups and reinsert to publisher queue.
    const createdRollups = await this.rollupDb.getCreatedRollups();
    createdRollups.forEach(({ id, proofData, txs }) => {
      console.log(`Rollup restored: ${id}`);
      this.publishQueue.put({
        rollupId: id,
        proof: proofData!,
        viewingKeys: txs.map(tx => [tx.viewingKey1, tx.viewingKey2]).flat(),
      });
    });

    // Find all txs without rollup ids and insert into tx queue.
    const txs = await this.rollupDb.getPendingTxs();
    for (const tx of txs) {
      console.log(`Tx restored: ${tx.txId.toString('hex')}`);
      const proof = new JoinSplitProof(tx.proofData, [tx.viewingKey1, tx.viewingKey2]);
      proof.dataRootsIndex = await this.rollupDb.getDataRootsIndex(proof.noteTreeRoot);
      const nullifier1 = toBigIntBE(proof.nullifier1);
      const nullifier2 = toBigIntBE(proof.nullifier2);
      this.pendingNullifiers.add(nullifier1);
      this.pendingNullifiers.add(nullifier2);
      this.txQueue.put(proof);
    }
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
      await this.rollupDb.addRollup(rollup);

      const proof = await this.proofGenerator.createProof(rollup);
      if (!proof) {
        // This shouldn't happen!? What happens to the txs?
        // Perhaps need to extract the troublemaker, and then reinsert all txs into queue?
        await this.worldStateDb.rollback();
        await this.rollupDb.deleteRollup(rollup.rollupId);
        continue;
      }

      await this.rollupDb.setRollupProof(rollup.rollupId, proof);
      await this.worldStateDb.commit();
      await this.rollupDb.confirmRollupCreated(rollup.rollupId);

      const viewingKeys = txs.map(tx => tx.viewingKeys).flat();
      this.publishQueue.put({ rollupId: rollup.rollupId, proof, viewingKeys });

      this.printState();
    }
  }

  private async processPublishQueue() {
    while (true) {
      const { rollupId, proof, viewingKeys } = (await this.publishQueue.get()) || ({} as PublishQueueItem);
      if (!proof) {
        break;
      }

      while (true) {
        try {
          const txHash = await this.blockchain.sendProof(proof!, rollupId, this.config.rollupSize, viewingKeys!);

          await this.rollupDb.confirmSent(rollupId);

          const receipt = await this.blockchain.getTransactionReceipt(txHash!);

          await this.rollupDb.confirmRollup(rollupId, receipt.blockNum);
          break;
        } catch (err) {
          // Could have failed due to not sending (network error), or not getting mined (gas too low?).
          // But, the proof is assumed to always be valid. So let's try again.
          console.log(err.message);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  public getBlocks(from: number) {
    return this.blockchain.getBlocks(from);
  }

  public async getLatestRollups(count: number) {
    return this.rollupDb.getLatestRollups(count);
  }

  public async getLatestTxs(count: number) {
    return this.rollupDb.getLatestTxs(count);
  }

  public async getRollup(id: number) {
    return this.rollupDb.getRollupWithTxs(id);
  }

  public async getTxs(txIds: Buffer[]) {
    return this.rollupDb.getTxsByTxIds(txIds);
  }

  public async getTx(txId: Buffer) {
    return this.rollupDb.getTxByTxId(txId);
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

    proof.dataRootsIndex = await this.rollupDb.getDataRootsIndex(proof.noteTreeRoot);

    this.pendingNullifiers.add(nullifier1);
    this.pendingNullifiers.add(nullifier2);
    const txId = await this.rollupDb.addTx(proof);
    this.txQueue.put(proof);

    return txId;
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

    // Get root tree data.
    const oldDataRootsRoot = this.worldStateDb.getRoot(2);
    const rootTreeSize = this.worldStateDb.getSize(2);
    const oldDataRootsPath = await this.worldStateDb.getHashPath(2, rootTreeSize);
    await this.worldStateDb.put(2, rootTreeSize, newDataRoot);
    const newDataRootsRoot = this.worldStateDb.getRoot(2);
    const newDataRootsPath = await this.worldStateDb.getHashPath(2, rootTreeSize);

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

      oldDataRootsRoot,
      newDataRootsRoot,
      oldDataRootsPath,
      newDataRootsPath,
      dataRootsPaths,
      dataRootsIndicies,
    );
  }
}
