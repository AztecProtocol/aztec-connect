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
import { Block, Blockchain } from 'blockchain';
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

export interface ServerStatus {
  chainId: number;
  networkOrHost: string;
  rollupContractAddress: string;
  tokenContractAddress: string;
  dataSize: number;
  dataRoot: string;
  nullRoot: string;
  rootRoot: string;
}

interface PublishItem {
  rollupId: number;
  proof: Buffer;
  signatures: Buffer[];
  sigIndexes: number[];
  viewingKeys: Buffer[];
}

export class Server {
  private joinSplitVerifier!: JoinSplitVerifier;
  private accountVerifier!: AccountVerifier;
  private worker!: BarretenbergWorker;
  private serialQueue = new MemoryFifo<() => Promise<void>>();
  private txQueue = new MemoryFifo<JoinSplitProof | undefined>();
  private proofGenerator: ProofGenerator;
  private pendingNullifiers = new Set<bigint>();

  constructor(
    private config: ServerConfig,
    private blockchain: Blockchain,
    private rollupDb: RollupDb,
    private worldStateDb: WorldStateDb,
  ) {
    if (!this.config.rollupSize) {
      throw new Error('Rollup size must be greater than 0.');
    }

    if (config.minRollupInterval.asSeconds() > config.maxRollupWaitTime.asSeconds()) {
      throw new Error('minRollupInterval must be <= maxRollupWaitTime');
    }

    this.proofGenerator = new ProofGenerator(this.config.rollupSize);
  }

  public async start() {
    console.log('Server start...');
    await this.proofGenerator.run();
    await this.worldStateDb.start();

    await this.restoreState();

    this.blockchain.on('block', block =>
      this.serialQueue.put(async () => {
        await this.handleBlock(block);
        this.printState();
      }),
    );
    const lastBlockNum = await this.rollupDb.getLastBlockNum();
    await this.blockchain.start(lastBlockNum + 1);

    await this.createVerifiers();

    this.processTxQueue(this.config.maxRollupWaitTime, this.config.minRollupInterval);
    this.serialQueue.process(async (fn: () => Promise<void>) => await fn());

    this.printState();
  }

  public stop() {
    this.blockchain.stop();
    this.proofGenerator.cancel();
    this.serialQueue.cancel();
    this.txQueue.cancel();
    destroyWorker(this.worker);
  }

  /**
   * Called as part of server startup.
   * Synchronise all onchain data into world state db and rollup db.
   * Insert all transactions into the transaction queue.
   */
  private async restoreState() {
    await this.syncDb();

    // Find all txs without rollup ids and insert into tx queue.
    const txs = await this.rollupDb.getPendingTxs();
    for (const tx of txs) {
      console.log(`Tx restored: ${tx.txId.toString('hex')}`);
      const proof = new JoinSplitProof(tx.proofData, [tx.viewingKey1, tx.viewingKey2], tx.signature);
      proof.dataRootsIndex = await this.rollupDb.getDataRootsIndex(proof.noteTreeRoot);

      // TODO: Get rid of this in memory stuff. Just check db for nullifiers.
      const nullifier1 = nullifierBufferToIndex(proof.nullifier1);
      const nullifier2 = nullifierBufferToIndex(proof.nullifier2);
      this.pendingNullifiers.add(nullifier1);
      this.pendingNullifiers.add(nullifier2);

      this.txQueue.put(proof);
    }
  }

  /**
   * Processes all rollup blocks from the last settled rollup in the rollup db.
   * Called as part of server startup and if the pipeline detects the contract state changed underfoot.
   */
  private async syncDb() {
    console.log('Syncing db...');
    const lastBlockNum = await this.rollupDb.getLastBlockNum();
    const blocks = await this.getBlocks(lastBlockNum + 1);

    for (const block of blocks) {
      await this.handleBlock(block);
    }

    await this.rollupDb.deleteUnsettledRollups();
  }

  private async handleBlock(block: Block) {
    const { rollupProofData, viewingKeysData } = block;
    const rollup = RollupProofData.fromBuffer(rollupProofData, viewingKeysData);

    const existingRollup = await this.rollupDb.getRollupFromHash(rollup.rollupHash);
    if (existingRollup && existingRollup.status === 'SETTLED') {
      return;
    }

    console.log(`Processing rollup ${rollup.rollupId}: ${rollup.rollupHash.toString('hex')}...`);
    await this.addRollupToWorldState(rollup);
    await this.confirmOrAddRollupToDb(rollup, block);
  }

  private async confirmOrAddRollupToDb(rollup: RollupProofData, block: Block) {
    const { blockNum, txHash, rollupProofData } = block;
    if (await this.rollupDb.getRollupFromHash(rollup.rollupHash)) {
      await this.rollupDb.confirmRollup(rollup.rollupId, blockNum);
    } else {
      const rollupDao = new RollupDao();

      const txs: TxDao[] = [];
      for (const tx of rollup.innerProofData) {
        const txDao = innerProofDataToTxDao(tx);
        txDao.rollup = rollupDao;
        txs.push(txDao);
      }

      // Note there may be a rollup with a rollupId that this server committed into
      // it's local database. If instead another rollup was mined before this on-chain
      // we want to overrwrite the rollup in the db local to this rollupProcessor.
      rollupDao.hash = rollup.rollupHash;
      rollupDao.id = rollup.rollupId;
      rollupDao.ethBlock = blockNum;
      rollupDao.ethTxHash = txHash;
      rollupDao.dataRoot = rollup.newDataRoot;
      rollupDao.proofData = rollupProofData;
      rollupDao.txs = txs;
      rollupDao.status = 'SETTLED';
      rollupDao.created = new Date();
      await this.rollupDb.addRollupDao(rollupDao);
    }
  }

  private async addRollupToWorldState(rollup: RollupProofData) {
    const { rollupId, rollupSize, dataStartIndex, innerProofData } = rollup;
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
    await this.worldStateDb.put(2, BigInt(rollupId + 1), this.worldStateDb.getRoot(0));
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
      rollupContractAddress: this.blockchain.getRollupContractAddress().toString(),
      tokenContractAddress: this.blockchain.getTokenContractAddress().toString(),
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
      this.serialQueue.put(() => this.createAndPublishRollup(rollupTxs));

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

  private async createAndPublishRollup(txs: JoinSplitProof[]) {
    while (true) {
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

      const viewingKeys = txs.map(tx => tx.viewingKeys).flat();
      const signatures = txs.reduce((acc, tx) => (tx.signature ? [...acc, tx.signature] : acc), [] as Buffer[]);
      const sigIndexes = txs.reduce((acc, tx, i) => (tx.signature ? [...acc, i] : acc), [] as number[]);

      const publishItem = {
        rollupId: rollup.rollupId,
        proof,
        signatures,
        sigIndexes,
        viewingKeys,
      };

      const blockNum = await this.publishRollup(publishItem);

      if (blockNum === undefined) {
        console.log('Contract changed underfoot.');
        await this.worldStateDb.rollback();
        await this.syncDb();
        this.printState();
        continue;
      }

      await this.worldStateDb.commit();
      await this.rollupDb.confirmRollup(rollup.rollupId, blockNum);

      this.printState();
      break;
    }
  }

  private async sendRollupProof(item: PublishItem) {
    const { proof, signatures, sigIndexes, viewingKeys } = item;
    while (true) {
      try {
        return await this.blockchain.sendRollupProof(proof, signatures, sigIndexes, viewingKeys);
      } catch (err) {
        console.log(err);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  private async getTransactionReceipt(txHash: Buffer) {
    while (true) {
      try {
        return await this.blockchain.getTransactionReceipt(txHash);
      } catch (err) {
        console.log(err);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  private async publishRollup(item: PublishItem) {
    while (true) {
      const txHash = await this.sendRollupProof(item);

      await this.rollupDb.confirmSent(item.rollupId, txHash);

      const { status, blockNum } = await this.getTransactionReceipt(txHash);
      if (!status) {
        const { nextRollupId } = await this.blockchain.status();
        if (nextRollupId > item.rollupId) {
          console.log('nextRollupId: ', nextRollupId, 'item.rollupId: ', item.rollupId);
          return;
        } else {
          console.log(`Transaction status failed: ${txHash.toString('hex')}`);
          await new Promise(resolve => setTimeout(resolve, 60000));
          continue;
        }
      }

      return blockNum;
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

    // at point of receiving joinsplit tx, if escape hatch activated, the db will be out of sync
    // where does the sdk get it's note tree stuff when it constructs the proof
    // it gets the data from falafel - queries falafel when it constructs the joinsplit
    // Flow
    // 1) Escape hatch happens, roots on the contract change
    // 2) Client constructs a joinSplit proof. It queries the falafel db to do so
    // 3) These roots will be incorrect,
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
    const dataSize = this.worldStateDb.getSize(0);
    const toInsert = BigInt(rollupSize * 2);
    const dataStartIndex = dataSize % toInsert === 0n ? dataSize : dataSize + toInsert - (dataSize % toInsert);

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
