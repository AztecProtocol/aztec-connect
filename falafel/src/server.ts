import { ClientTx } from "./client_tx";
import { WorldStateDb } from "./world_state_db";
import { Crs } from "barretenberg/crs";
import { BarretenbergWasm } from "barretenberg/wasm";
import { createWorker, destroyWorker } from "barretenberg/wasm/worker_factory";
import { SinglePippenger } from "barretenberg/pippenger";
import { JoinSplitVerifier } from "barretenberg/client_proofs/join_split_proof";
import { Block } from "barretenberg/block_source";
import { toBigIntBE } from "bigint-buffer";
import { BarretenbergWorker } from "barretenberg/wasm/worker";
import { LocalBlockchain } from "./blockchain";
import { MemoryFifo } from "./fifo";
import { RollupDb } from "./rollup_db";
import { Rollup } from "./rollup";
import { createConnection } from 'typeorm';
import { Proof } from 'barretenberg/rollup_provider';

export class Server {
  private interval?: NodeJS.Timer;
  private worldStateDb: WorldStateDb;
  private maxBlockInterval = 600 * 1000;
  private joinSplitVerifier!: JoinSplitVerifier;
  private blockchain!: LocalBlockchain;
  private worker!: BarretenbergWorker;
  private rollupDb!: RollupDb;
  private blockQueue = new MemoryFifo<Block>();

  constructor(private batchSize: number) {
    this.worldStateDb = new WorldStateDb();
  }

  public async start() {
    const connection = await createConnection();
    this.blockchain = new LocalBlockchain(connection);
    this.rollupDb = new RollupDb(connection);
    await this.blockchain.init();
    await this.rollupDb.init();
    await this.worldStateDb.start();
    await this.createJoinSplitVerifier();
    this.interval = setInterval(() => this.flushTxs(), this.maxBlockInterval);
    this.blockchain.on("block", (b) => this.blockQueue.put(b));
    this.processQueue();
  }

  public stop() {
    this.blockQueue.cancel();
    clearInterval(this.interval!);
    destroyWorker(this.worker);
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
    for (let i = 0; i < block.dataEntries.length; ++i) {
      await this.worldStateDb.put(
        0,
        BigInt(block.dataStartIndex + i),
        block.dataEntries[i]
      );
    }

    const nullifierValue = Buffer.alloc(64, 0);
    nullifierValue.writeUInt8(1, 63);
    for (let i = 0; i < block.nullifiers.length; ++i) {
      await this.worldStateDb.put(
        1,
        toBigIntBE(block.nullifiers[i]),
        nullifierValue
      );
    }

    await this.worldStateDb.commit();

    // TODO: Confirm rollup by adding eth block and tx hash.
    // await this.rollupDb.confirm(block);
  }

  public getBlocks(from: number) {
    return this.blockchain.getBlocks(from);
  }

  private async createJoinSplitVerifier() {
    console.log("Generating keys...");
    const circuitSize = 128 * 1024;

    const crs = new Crs(circuitSize);
    await crs.download();

    const barretenberg = await BarretenbergWasm.new();
    this.worker = await createWorker("0", barretenberg.module);

    const pippenger = new SinglePippenger(this.worker);
    await pippenger.init(crs.getData());

    // We need to init the proving key to create the verification key...
    await this.worker.call("join_split__init_proving_key");

    this.joinSplitVerifier = new JoinSplitVerifier(pippenger);
    await this.joinSplitVerifier.init(crs.getG2Data());

    // destroyWorker(worker);
    console.log("Done.");
  }

  public async receiveTx({ proofData, encViewingKey1, encViewingKey2 }: Proof) {
    const clientTx = new ClientTx(proofData);

    console.log(clientTx);

    // Check nullifiers don't exist (tree id 1 returns 0 at index).
    const emptyValue = Buffer.alloc(64, 0);
    const nullifierVal1 = await this.worldStateDb.get(1, clientTx.nullifier1);
    if (!nullifierVal1.equals(emptyValue)) {
      throw new Error("Nullifier 1 already exists.");
    }
    const nullifierVal2 = await this.worldStateDb.get(1, clientTx.nullifier2);
    if (!nullifierVal2.equals(emptyValue)) {
      throw new Error("Nullifier 2 already exists.");
    }

    if (!clientTx.noteTreeRoot.equals(this.worldStateDb.getRoot(0))) {
      throw new Error("Merkle roots do not match.");
    }

    console.log("Attempting verify...");
    if (!await this.joinSplitVerifier.verifyProof(proofData)) {
      throw new Error("Proof verification failed.");
    }

    console.log("Verification complete. Adding to mempool.");

    const rollup: Rollup = {
      rollupId: this.rollupDb.getNextRollupId(),
      txs: [clientTx],
    };
    await this.rollupDb.addRollup(rollup);

    this.blockchain.sendProof(proofData, rollup.rollupId, [encViewingKey1, encViewingKey2]);
  }

  public flushTxs() {}
}
