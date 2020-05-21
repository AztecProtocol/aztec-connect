import { Block } from 'barretenberg/block_source';
import { JoinSplitProof, JoinSplitVerifier } from 'barretenberg/client_proofs/join_split_proof';
import { Crs } from 'barretenberg/crs';
import { HashPath } from 'barretenberg/merkle_tree';
import { SinglePippenger } from 'barretenberg/pippenger';
import { Proof } from 'barretenberg/rollup_provider';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { BarretenbergWorker } from 'barretenberg/wasm/worker';
import { createWorker, destroyWorker } from 'barretenberg/wasm/worker_factory';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import fs from 'fs';
import moment, { Duration } from 'moment';
import { createConnection } from 'typeorm';
import { LocalBlockchain } from './blockchain';
import { MemoryFifo } from './fifo';
import { ProofGenerator } from './proof_generator';
import { Rollup } from './rollup';
import { RollupDb } from './rollup_db';
import { WorldStateDb } from './world_state_db';

interface ServerState {
  readonly rollupSize: number;
  lastSyncedBlock: number;
}

export class Server {
  private worldStateDb: WorldStateDb;
  private joinSplitVerifier!: JoinSplitVerifier;
  private blockchain!: LocalBlockchain;
  private worker!: BarretenbergWorker;
  private rollupDb!: RollupDb;
  private stateQueue = new MemoryFifo<() => Promise<void>>();
  private txQueue = new MemoryFifo<JoinSplitProof | null>();
  private proofGenerator: ProofGenerator;
  private state: ServerState;

  constructor(private serverStateFilePath: string) {
    try {
      const jsonStr = fs.readFileSync(serverStateFilePath, 'utf8');
      this.state = JSON.parse(jsonStr);
    } catch (e) {
      this.state = {
        rollupSize: 1,
        lastSyncedBlock: -1,
      };
    }
    if (!this.state.rollupSize) {
      throw new Error('Rollup size must be greater than 0.');
    }
    this.worldStateDb = new WorldStateDb();
    this.proofGenerator = new ProofGenerator(this.state.rollupSize);
  }

  public async start() {
    this.proofGenerator.run();
    const connection = await createConnection();
    this.blockchain = new LocalBlockchain(connection, this.state.rollupSize);
    this.rollupDb = new RollupDb(connection);
    await this.blockchain.init();
    await this.rollupDb.init();
    await this.worldStateDb.start();
    this.printState();
    await this.createJoinSplitVerifier();
    const newBlocks = this.getBlocks(this.state.lastSyncedBlock + 1);
    for (const block of newBlocks) {
      await this.handleNewBlock(block);
    }
    this.blockchain.on('block', b => this.stateQueue.put(() => this.handleNewBlock(b)));
    this.processStateQueue();
    this.processTxQueue(moment.duration(30, 's'), moment.duration(30, 's'));
  }

  public stop() {
    this.proofGenerator.cancel();
    this.stateQueue.cancel();
    this.txQueue.cancel();
    destroyWorker(this.worker);
  }

  private printState() {
    console.log(`Data size: ${this.worldStateDb.getSize(0)}`);
    console.log(`Data root: ${this.worldStateDb.getRoot(0).toString('hex')}`);
    console.log(`Null root: ${this.worldStateDb.getRoot(1).toString('hex')}`);
    console.log(`Root root: ${this.worldStateDb.getRoot(2).toString('hex')}`);
  }

  private updateServerState(key: keyof ServerState, value: number) {
    if (key === 'rollupSize') {
      return;
    }

    this.state = {
      ...this.state,
      [key]: value,
    };
    const newStateJson = JSON.stringify(this.state, null, 2);

    try {
      fs.writeFileSync(this.serverStateFilePath, `${newStateJson}\n`);
      this.state[key] = value;
    } catch (e) {
      console.log(e);
    }
  }

  public status() {
    return {
      dataSize: Number(this.worldStateDb.getSize(0)),
      dataRoot: this.worldStateDb.getRoot(0).toString('hex'),
      nullRoot: this.worldStateDb.getRoot(1).toString('hex'),
      rootRoot: this.worldStateDb.getRoot(2).toString('hex'),
    };
  }

  private async processStateQueue() {
    while (true) {
      const f = await this.stateQueue.get();
      if (!f) {
        break;
      }
      await f();
    }
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
      if (tx === undefined) {
        break;
      }

      if (tx) {
        txs.push(tx);
      }

      clearTimeout(flushTimeout);
      flushTimeout = setTimeout(() => this.flushTxs(), maxRollupWaitTime.asMilliseconds());

      const shouldRollup =
        txs.length &&
        (tx === null ||
          txs.length === this.state.rollupSize ||
          lastTxReceivedTime.isBefore(moment().subtract(maxRollupWaitTime)));

      if (tx) {
        lastTxReceivedTime = moment();
      }

      if (shouldRollup) {
        const rollupTxs = txs;
        txs = [];
        this.stateQueue.put(() => this.rollup(rollupTxs));

        // Throttle.
        await new Promise(resolve => setTimeout(resolve, minRollupInterval.asMilliseconds()));
      }
    }

    clearInterval(flushTimeout);
  }

  private async handleNewBlock(block: Block) {
    console.log(`Processing block ${block.blockNum}...`);

    for (let i = 0; i < block.dataEntries.length; ++i) {
      await this.worldStateDb.put(0, BigInt(block.dataStartIndex + i), block.dataEntries[i]);
    }

    // Pad data tree with zero entries to ensure correct size.
    if (block.dataEntries.length < block.numDataEntries) {
      await this.worldStateDb.put(0, BigInt(block.dataStartIndex + block.numDataEntries - 1), Buffer.alloc(64, 0));
    }

    // Update data root tree with latest.
    const dataRoot = this.worldStateDb.getRoot(0);
    await this.worldStateDb.put(2, BigInt(block.rollupId + 1), dataRoot);

    // Set nullifiers.
    const nullifier = Buffer.alloc(64, 0);
    nullifier.writeUInt8(1, 63);
    for (const nullifier of block.nullifiers) {
      await this.worldStateDb.put(1, toBigIntBE(nullifier), nullifier);
    }

    await this.worldStateDb.commit();
    this.printState();

    if (block.blockNum > this.state.lastSyncedBlock) {
      this.updateServerState('lastSyncedBlock', block.blockNum);
    }

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

  public async receiveTx({ proofData, viewingKeys }: Proof) {
    const proof = new JoinSplitProof(proofData, viewingKeys);

    // Check nullifiers don't exist.
    const emptyValue = Buffer.alloc(64, 0);
    const nullifierVal1 = await this.worldStateDb.get(1, proof.nullifier1);
    if (!nullifierVal1.equals(emptyValue)) {
      throw new Error('Nullifier 1 already exists.');
    }
    const nullifierVal2 = await this.worldStateDb.get(1, proof.nullifier2);
    if (!nullifierVal2.equals(emptyValue)) {
      throw new Error('Nullifier 2 already exists.');
    }

    // Check the proof is valid.
    if (!(await this.joinSplitVerifier.verifyProof(proofData))) {
      throw new Error('Proof verification failed.');
    }

    // Lookup and save the proofs data root index (for old root support).
    if (this.worldStateDb.getSize(2) > 1n) {
      const rollup = await this.rollupDb.getRollupByDataRoot(proof.noteTreeRoot);
      if (!rollup) {
        throw new Error(`Rollup not found for merkle root: ${proof.noteTreeRoot.toString('hex')}`);
      }
      proof.dataRootsIndex = rollup.id + 1;
    }

    this.txQueue.put(proof);
  }

  public flushTxs() {
    this.txQueue.put(null);
  }

  private async createRollup(txs: JoinSplitProof[]) {
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

      oldNullPaths.push(await this.worldStateDb.getHashPath(1, proof.nullifier1));
      await this.worldStateDb.put(1, proof.nullifier1, toBufferBE(1n, 64));
      newNullRoots.push(this.worldStateDb.getRoot(1));
      newNullPaths.push(await this.worldStateDb.getHashPath(1, proof.nullifier1));

      oldNullPaths.push(await this.worldStateDb.getHashPath(1, proof.nullifier2));
      await this.worldStateDb.put(1, proof.nullifier2, toBufferBE(1n, 64));
      newNullRoots.push(this.worldStateDb.getRoot(1));
      newNullPaths.push(await this.worldStateDb.getHashPath(1, proof.nullifier2));

      dataRootsPaths.push(await this.worldStateDb.getHashPath(2, BigInt(proof.dataRootsIndex)));
      dataRootsIndicies.push(proof.dataRootsIndex);
    }

    // Get new data.
    const newDataPath = await this.worldStateDb.getHashPath(0, dataStartIndex);
    const rollupRootHeight = Math.log2(this.state.rollupSize) + 1;
    const rootIndex = (Number(dataStartIndex) / (this.state.rollupSize * 2)) % 2;
    const rollupRoot = newDataPath.data[rollupRootHeight][rootIndex];
    const newDataRoot = this.worldStateDb.getRoot(0);

    // Discard changes.
    await this.worldStateDb.rollback();

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

  private async rollup(txs: JoinSplitProof[]) {
    console.log(`Creating rollup with ${txs.length} txs...`);
    const rollup = await this.createRollup(txs);
    this.createProof(rollup, txs.map(tx => tx.viewingKeys).flat());
    await this.rollupDb.addRollup(rollup);
  }

  private async createProof(rollup: Rollup, viewingKeys: Buffer[]) {
    const proof = await this.proofGenerator.createProof(rollup);
    if (proof) {
      this.blockchain.sendProof(proof, rollup.rollupId, this.state.rollupSize, viewingKeys);
    } else {
      console.log('Invalid proof.');
    }
  }
}
