import { AccountVerifier } from 'barretenberg/client_proofs/account_proof';
import { JoinSplitProof, JoinSplitVerifier, nullifierBufferToIndex } from 'barretenberg/client_proofs/join_split_proof';
import { Crs } from 'barretenberg/crs';
import { MemoryFifo } from 'barretenberg/fifo';
import { readFileAsync } from 'barretenberg/fs_async';
import { HashPath } from 'barretenberg/merkle_tree';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { Proof } from 'barretenberg/rollup_provider';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { BarretenbergWorker } from 'barretenberg/wasm/worker';
import { createWorker, destroyWorker } from 'barretenberg/wasm/worker_factory';
import { WorldStateDb } from 'barretenberg/world_state_db';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';
import { Blockchain } from 'blockchain';
import { Duration } from 'moment';
import { RollupDao } from './entity/rollup';
import { TxDao } from './entity/tx';
import { ProofGenerator } from './proof_generator';
import { Rollup } from './rollup';
import { innerProofDataToTxDao, RollupDb } from './rollup_db';

export interface ServerConfig {
  readonly rollupSize: number;
  readonly maxRollupWaitTime: Duration;
  readonly minRollupInterval: Duration;
}

interface PublishQueueItem {
  rollupId: number;
  proof: Buffer;
  signatures: Buffer[];
  sigIndexes: number[];
  viewingKeys: Buffer[];
  rollupSize: number;
}

export class Server {
  private worldStateDb: WorldStateDb;
  private joinSplitVerifier!: JoinSplitVerifier;
  private accountVerifier!: AccountVerifier;
  private worker!: BarretenbergWorker;
  private rollupQueue = new MemoryFifo<JoinSplitProof[]>();
  private publishQueue = new MemoryFifo<PublishQueueItem>();
  private txQueue = new MemoryFifo<JoinSplitProof | undefined>();
  private proofGenerator: ProofGenerator;
  private pendingNullifiers = new Set<bigint>();

  constructor(private config: ServerConfig, private blockchain: Blockchain, private rollupDb: RollupDb) {
    if (!this.config.rollupSize) {
      throw new Error('Rollup size must be greater than 0.');
    }

    if (config.minRollupInterval.asSeconds() > config.maxRollupWaitTime.asSeconds()) {
      throw new Error('minRollupInterval must be <= maxRollupWaitTime');
    }

    this.worldStateDb = new WorldStateDb();
    this.proofGenerator = new ProofGenerator(this.config.rollupSize);
  }

  public async start() {
    console.log('Server start...');
    await this.proofGenerator.run();
    await this.worldStateDb.start();
    // We know all historical blocks will be available in a call to restoreState once this returns.
    await this.blockchain.start();
    await this.createVerifiers();
    await this.restoreState();
    this.printState();

    this.processTxQueue(this.config.maxRollupWaitTime, this.config.minRollupInterval);
    this.rollupQueue.process(this.rollupQueueHandler.bind(this));
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
    const lastBlockNum = await this.rollupDb.getLastBlockNum();

    // If lastBlockNum = -1, db is empty and we should attempt a restore from chain.
    if (lastBlockNum === -1) {
      await this.restoreWorldStateDb();
    }

    // Ensure we confirm any rollups that we have missed while not running.
    const newBlocks = await this.getBlocks((await this.rollupDb.getLastBlockNum()) + 1);
    for (const block of newBlocks) {
      const { rollupProofData, viewingKeysData } = block;
      const rollup = RollupProofData.fromBuffer(rollupProofData, viewingKeysData);
      if (await this.rollupDb.getRollup(rollup.rollupId)) {
        await this.rollupDb.confirmRollup(rollup.rollupId, block.blockNum);
      } else {
        console.log(`Restoring rollup ${rollup.rollupId} with data root: ${rollup.newDataRoot.toString('hex')}`);

        const rollupDao = new RollupDao();

        const txs: TxDao[] = [];
        for (const tx of rollup.innerProofData) {
          const txDao = innerProofDataToTxDao(tx);
          txDao.rollup = rollupDao;
          txs.push(txDao);
        }

        rollupDao.id = rollup.rollupId;
        rollupDao.ethBlock = block.blockNum;
        rollupDao.ethTxHash = block.txHash;
        rollupDao.dataRoot = rollup.newDataRoot;
        rollupDao.proofData = rollupProofData;
        rollupDao.txs = txs;
        rollupDao.status = 'SETTLED';
        rollupDao.created = new Date();
        await this.rollupDb.addRollupDao(rollupDao);
      }
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
      const signatures = txs.reduce((acc, tx) => (tx.signature ? [...acc, tx.signature] : acc), [] as Buffer[]);
      const sigIndexes = txs.reduce((acc, tx, i) => (tx.signature ? [...acc, i] : acc), [] as number[]);
      this.publishQueue.put({
        rollupId: id,
        proof: proofData!,
        signatures,
        sigIndexes,
        viewingKeys: txs.map(tx => [tx.viewingKey1, tx.viewingKey2]).flat(),
        rollupSize: this.config.rollupSize,
      });
    });

    // Find all txs without rollup ids and insert into tx queue.
    const txs = await this.rollupDb.getPendingTxs();
    for (const tx of txs) {
      console.log(`Tx restored: ${tx.txId.toString('hex')}`);
      const proof = new JoinSplitProof(tx.proofData, [tx.viewingKey1, tx.viewingKey2], tx.signature);
      proof.dataRootsIndex = await this.rollupDb.getDataRootsIndex(proof.noteTreeRoot);
      const nullifier1 = nullifierBufferToIndex(proof.nullifier1);
      const nullifier2 = nullifierBufferToIndex(proof.nullifier2);
      this.pendingNullifiers.add(nullifier1);
      this.pendingNullifiers.add(nullifier2);
      this.txQueue.put(proof);
    }
  }

  private async restoreWorldStateDb() {
    const allBlocks = await this.getBlocks(0);
    console.log('Restoring world state db...');

    for (let i = 0; i < allBlocks.length; ++i) {
      const { rollupSize, rollupProofData, viewingKeysData } = allBlocks[i];
      const { dataStartIndex, innerProofData } = RollupProofData.fromBuffer(rollupProofData, viewingKeysData);
      for (let i = 0; i < innerProofData.length; ++i) {
        const tx = innerProofData[i];
        await this.worldStateDb.put(0, BigInt(dataStartIndex + i * rollupSize), tx.newNote1);
        await this.worldStateDb.put(0, BigInt(dataStartIndex + i * rollupSize + 1), tx.newNote2);
        await this.worldStateDb.put(1, nullifierBufferToIndex(tx.nullifier1), toBufferBE(1n, 64));
        await this.worldStateDb.put(1, nullifierBufferToIndex(tx.nullifier2), toBufferBE(1n, 64));
      }
      if (innerProofData.length < rollupSize) {
        await this.worldStateDb.put(0, BigInt(dataStartIndex + rollupSize * 2 - 1), Buffer.alloc(64, 0));
      }
      await this.worldStateDb.put(2, BigInt(i + 1), this.worldStateDb.getRoot(0));
    }

    await this.worldStateDb.commit();

    console.log('World state db restoration complete.');
  }

  private printState() {
    console.log(`Data size: ${this.worldStateDb.getSize(0)}`);
    console.log(`Data root: ${this.worldStateDb.getRoot(0).toString('hex')}`);
    console.log(`Null root: ${this.worldStateDb.getRoot(1).toString('hex')}`);
    console.log(`Root root: ${this.worldStateDb.getRoot(2).toString('hex')}`);
  }

  public async status() {
    const { chainId, networkOrHost } = await this.blockchain.getNetworkInfo();
    return {
      chainId,
      networkOrHost,
      rollupContractAddress: this.blockchain.getRollupContractAddress(),
      tokenContractAddress: this.blockchain.getTokenContractAddress(),
      dataSize: Number(this.worldStateDb.getSize(0)),
      dataRoot: this.worldStateDb.getRoot(0).toString('hex'),
      nullRoot: this.worldStateDb.getRoot(1).toString('hex'),
      rootRoot: this.worldStateDb.getRoot(2).toString('hex'),
    };
  }

  private async processTxQueue(maxRollupWaitTime: Duration, minRollupInterval: Duration) {
    let flushTimeout!: NodeJS.Timeout;
    let txs: JoinSplitProof[] = [];

    const emitRollup = async () => {
      if (txs.length === 0) {
        return;
      }

      clearTimeout(flushTimeout);
      const rollupTxs = txs;
      txs = [];
      this.rollupQueue.put(rollupTxs);

      // Throttle.
      await new Promise(resolve => setTimeout(resolve, minRollupInterval.asMilliseconds()));
    };

    await this.txQueue.process(async tx => {
      // Flush received.
      if (tx === undefined) {
        await emitRollup();
        return;
      }

      // First transaction of the rollup, set the flush timeout.
      if (txs.length === 0) {
        flushTimeout = setTimeout(() => this.flushTxs(), maxRollupWaitTime.asMilliseconds());
      }

      txs.push(tx);

      if (txs.length === this.config.rollupSize) {
        await emitRollup();
      }
    });

    clearInterval(flushTimeout);
  }

  private async rollupQueueHandler(txs: JoinSplitProof[]) {
    try {
      console.log(`Creating rollup with ${txs.length} txs...`);
      const rollup = await this.createRollup(txs);
      await this.rollupDb.addRollup(rollup);

      const proof = await this.proofGenerator.createProof(rollup);

      if (!proof) {
        // This shouldn't happen!? What happens to the txs?
        // Perhaps need to extract the troublemaker, and then reinsert all txs into queue?
        await this.worldStateDb.rollback();
        await this.rollupDb.deleteRollup(rollup.rollupId);
        return;
      }

      await this.rollupDb.setRollupProof(rollup.rollupId, proof);
      await this.worldStateDb.commit();
      await this.rollupDb.confirmRollupCreated(rollup.rollupId);

      const viewingKeys = txs.map(tx => tx.viewingKeys).flat();
      const signatures = txs.reduce((acc, tx) => (tx.signature ? [...acc, tx.signature] : acc), [] as Buffer[]);
      const sigIndexes = txs.reduce((acc, tx, i) => (tx.signature ? [...acc, i] : acc), [] as number[]);

      this.publishQueue.put({
        rollupId: rollup.rollupId,
        proof,
        signatures,
        sigIndexes,
        viewingKeys,
        rollupSize: this.config.rollupSize,
      });

      this.printState();
    } catch (err) {
      console.error('Rollup queue handler exception, did rollup_cli die?');
      throw err;
    }
  }

  private async processPublishQueue() {
    while (true) {
      const item = await this.publishQueue.get();
      if (!item) {
        break;
      }
      const { rollupId, proof, signatures, sigIndexes, viewingKeys, rollupSize } = item;

      while (true) {
        try {
          const txHash = await this.blockchain.sendProof(proof, signatures, sigIndexes, viewingKeys);

          await this.rollupDb.confirmSent(rollupId, txHash);

          const receipt = await this.blockchain.getTransactionReceipt(txHash);

          await this.rollupDb.confirmRollup(rollupId, receipt.blockNum);
          break;
        } catch (err) {
          // Could have failed due to not sending (network error), or not getting mined (gas too low?).
          // But, the proof is assumed to always be valid. So let's try again.
          console.log(err);
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    }
  }

  public async getBlocks(from: number) {
    return await this.blockchain.getBlocks(from);
  }

  public getLatestRollupId() {
    return this.blockchain.getLatestRollupId();
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

  private async createVerifiers() {
    const crs = new Crs(0);
    await crs.downloadG2Data();

    const barretenberg = await BarretenbergWasm.new();
    this.worker = await createWorker('0', barretenberg.module);

    const jsKey = await readFileAsync('./data/join_split/verification_key');

    this.joinSplitVerifier = new JoinSplitVerifier();
    await this.joinSplitVerifier.loadKey(this.worker, jsKey, crs.getG2Data());

    const accountKey = await readFileAsync('./data/account/verification_key');

    this.accountVerifier = new AccountVerifier();
    await this.accountVerifier.loadKey(this.worker, accountKey, crs.getG2Data());
  }

  public async receiveTx({ proofData, depositSignature, viewingKeys }: Proof) {
    const proof = new JoinSplitProof(proofData, viewingKeys, depositSignature);
    const nullifier1 = nullifierBufferToIndex(proof.nullifier1);
    const nullifier2 = nullifierBufferToIndex(proof.nullifier2);

    console.log(`Received tx: ${proof.getTxId().toString('hex')}`);

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
    switch (proof.proofId) {
      case 0:
        await this.validateJoinSplitTx(proof);
        break;
      case 1:
        await this.validateAccountTx(proof);
        break;
    }

    proof.dataRootsIndex = await this.rollupDb.getDataRootsIndex(proof.noteTreeRoot);

    this.pendingNullifiers.add(nullifier1);
    this.pendingNullifiers.add(nullifier2);
    const txDao = await this.rollupDb.addTx(proof);
    this.txQueue.put(proof);

    return txDao;
  }

  private async validateJoinSplitTx(proof: JoinSplitProof) {
    const { publicInput, inputOwner } = proof;
    if (!(await this.joinSplitVerifier.verifyProof(proof.proofData))) {
      throw new Error('Join-split proof verification failed.');
    }

    if (toBigIntBE(publicInput) > 0n) {
      if (!proof.signature) {
        throw new Error('No deposit signature provided.');
      }

      if (!(await this.blockchain.validateSignature(inputOwner, proof.signature, proof.getDepositSigningData()))) {
        throw new Error('Invalid deposit signature.');
      }

      if (!(await this.blockchain.validateDepositFunds(inputOwner, publicInput))) {
        throw new Error('User has insufficient or unapproved deposit balance.');
      }
    }
  }

  private async validateAccountTx(proof: JoinSplitProof) {
    if (!(await this.accountVerifier.verifyProof(proof.proofData))) {
      throw new Error('Account proof verification failed.');
    }
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
    const accountNullPaths: HashPath[] = [];
    const dataRootsPaths: HashPath[] = [];
    const dataRootsIndicies: number[] = [];

    for (const proof of txs) {
      const accountNullifier = nullifierBufferToIndex(proof.accountNullifier);
      accountNullPaths.push(await this.worldStateDb.getHashPath(1, accountNullifier));
    }

    for (const proof of txs) {
      await this.worldStateDb.put(0, nextDataIndex++, proof.newNote1);
      await this.worldStateDb.put(0, nextDataIndex++, proof.newNote2);
      const nullifier1 = nullifierBufferToIndex(proof.nullifier1);
      const nullifier2 = nullifierBufferToIndex(proof.nullifier2);

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

      oldDataRoot,
      newDataRoot,
      oldDataPath,
      newDataPath,

      oldNullRoot,
      newNullRoots,
      oldNullPaths,
      newNullPaths,
      accountNullPaths,

      oldDataRootsRoot,
      newDataRootsRoot,
      oldDataRootsPath,
      newDataRootsPath,
      dataRootsPaths,
      dataRootsIndicies,
    );
  }
}
