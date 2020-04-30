import { ClientTx } from "./client_tx";
import { WorldStateDb } from "./world_state_db";
import { Crs } from "barretenberg/crs";
import { BarretenbergWasm } from "barretenberg/wasm";
import { createWorker, destroyWorker } from "barretenberg/wasm/worker_factory";
import { SinglePippenger } from "barretenberg/pippenger";
import { JoinSplitVerifier } from "barretenberg/client_proofs/join_split_proof";
import { Block } from "barretenberg/block_source";
import { toBufferBE } from 'bigint-buffer';

export class Server {
  private interval?: NodeJS.Timer;
  // private proof_generator: ProofGenerator;
  private worldStateDb: WorldStateDb;
  private txPool: ClientTx[] = [];
  private blockNum = 0;
  private maxBlockInterval = 600 * 1000;
  private joinSplitVerifier!: JoinSplitVerifier;
  private blockchain: Block[] = [];

  constructor(private batchSize: number) {
    this.worldStateDb = new WorldStateDb();
    // this.proof_generator = new ProofGenerator(batchSize);
  }

  public async start() {
    // this.proof_generator.run();
    await this.worldStateDb.destroy();
    await this.worldStateDb.start();
    await this.createJoinSplitVerifier();
    this.interval = setInterval(() => this.flushTxs(), this.maxBlockInterval);
  }

  public stop() {
    clearInterval(this.interval!);
    // this.proof_generator.cancel();
  }

  public getBlocks(from: number) {
    return this.blockchain.slice(from);
  }

  private async createJoinSplitVerifier() {
    console.log("Generating keys...");
    const circuitSize = 128 * 1024;

    const crs = new Crs(circuitSize);
    await crs.download();

    const barretenberg = await BarretenbergWasm.new();
    const worker = await createWorker("0", barretenberg.module);

    const pippenger = new SinglePippenger(worker);
    await pippenger.init(crs.getData());

    // We need to init the proving key to create the verification key...
    await worker.call("join_split__init_proving_key");

    this.joinSplitVerifier = new JoinSplitVerifier(pippenger);
    await this.joinSplitVerifier.init(crs.getG2Data());

    // destroyWorker(worker);
    console.log("Done.");
  }

  public async receiveTx(proofData: Buffer) {
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
      throw new Error("Merkle roots do not match.")
    }

    console.log('Attempting verify...');
    if (!await this.joinSplitVerifier.verifyProof(proofData)) {
      throw new Error("Proof verification failed.");
    }

    // TODO VERIFY ROOT
    console.log('Verification complete. Adding to mempool.');

    this.txPool.push(clientTx);

    this.createBlock();
    // if (this.txPool.length == this.batchSize) {
    //   this.createBlock();
    // }
  }

  public flushTxs() {
    if (this.txPool.length) {
      this.createBlock();
    }
  }

  private async createBlock() {
    const nullifierValue = Buffer.alloc(64, 0);
    nullifierValue.writeUInt8(1, 63);
    let dataIndex = this.worldStateDb.getSize(0);
    const block: Block = {
      blockNum: this.blockNum,
      dataStartIndex: Number(dataIndex),
      dataEntries: [],
      nullifiers: [],
    };

    for (let tx of this.txPool) {
      await this.worldStateDb.put(0, dataIndex++, tx.newNote1);
      await this.worldStateDb.put(0, dataIndex++, tx.newNote2);
      await this.worldStateDb.put(1, tx.nullifier1, nullifierValue);
      await this.worldStateDb.put(1, tx.nullifier2, nullifierValue);
      block.dataEntries.push(tx.newNote1, tx.newNote2);
      block.nullifiers.push(toBufferBE(tx.nullifier1, 16), toBufferBE(tx.nullifier2, 16));
    }
    await this.worldStateDb.commit();
    // Add all data elements and nullifiers in txPool to world state.
    // commit world state.
    this.txPool = [];
    this.blockNum++;
    this.blockchain.push(block);
    console.log('Added block:', block);
  }
}
