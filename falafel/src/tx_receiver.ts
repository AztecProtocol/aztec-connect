import { Blockchain } from 'barretenberg/blockchain';
import { AccountVerifier } from 'barretenberg/client_proofs/account_proof';
import { JoinSplitVerifier } from 'barretenberg/client_proofs/join_split_proof';
import { ProofId, ProofData, JoinSplitProofData } from 'barretenberg/client_proofs/proof_data';
import { Crs } from 'barretenberg/crs';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { BarretenbergWorker } from 'barretenberg/wasm/worker';
import { createWorker, destroyWorker } from 'barretenberg/wasm/worker_factory';
import { readFile } from 'fs-extra';
import { TxDao } from './entity/tx';
import { RollupDb } from './rollup_db';
import { Mutex } from 'async-mutex';

export interface Tx {
  proofData: Buffer;
  viewingKeys: Buffer[];
  depositSignature?: Buffer;
}

export class TxReceiver {
  private worker!: BarretenbergWorker;
  private joinSplitVerifier!: JoinSplitVerifier;
  private accountVerifier!: AccountVerifier;
  private mutex = new Mutex();

  constructor(private rollupDb: RollupDb, private blockchain: Blockchain, private minFees: bigint[]) {}

  public async init() {
    const crs = new Crs(0);
    await crs.downloadG2Data();

    const barretenberg = await BarretenbergWasm.new();
    this.worker = await createWorker('0', barretenberg.module);

    const jsKey = await readFile('./data/join_split/verification_key');
    this.joinSplitVerifier = new JoinSplitVerifier();
    await this.joinSplitVerifier.loadKey(this.worker, jsKey, crs.getG2Data());

    const accountKey = await readFile('./data/account/verification_key');
    this.accountVerifier = new AccountVerifier();
    await this.accountVerifier.loadKey(this.worker, accountKey, crs.getG2Data());
  }

  public async destroy() {
    await destroyWorker(this.worker);
  }

  public async receiveTx({ proofData, depositSignature, viewingKeys }: Tx) {
    // We mutex this entire receive call until we move to "deposit to proof hash". Read more below.
    await this.mutex.acquire();
    try {
      const proof = new ProofData(proofData);

      console.log(`Received tx: ${proof.txId.toString('hex')}`);

      // Check the proof is valid.
      switch (proof.proofId) {
        case ProofId.JOIN_SPLIT:
          await this.validateJoinSplitTx(proof, depositSignature);
          break;
        case ProofId.ACCOUNT:
          await this.validateAccountTx(proof);
          break;
      }

      if (await this.rollupDb.nullifiersExist(proof.nullifier1, proof.nullifier2)) {
        throw new Error('Nullifier already exists.');
      }

      const dataRootsIndex = await this.rollupDb.getDataRootsIndex(proof.noteTreeRoot);

      const txDao = new TxDao({
        id: proof.txId,
        proofData,
        viewingKey1: viewingKeys[0] || Buffer.alloc(0),
        viewingKey2: viewingKeys[1] || Buffer.alloc(0),
        signature: depositSignature,
        nullifier1: proof.nullifier1,
        nullifier2: proof.nullifier2,
        dataRootsIndex,
        created: new Date(),
      });

      await this.rollupDb.addTx(txDao);

      return proof.txId;
    } finally {
      this.mutex.release();
    }
  }

  private async validateJoinSplitTx(proofData: ProofData, signature?: Buffer) {
    const jsProofData = new JoinSplitProofData(proofData);
    const { txFee } = proofData;
    const { publicInput, inputOwner, assetId, depositSigningData } = jsProofData;

    if (txFee < this.minFees[assetId]) {
      throw new Error('Insufficient fee.');
    }

    if (!(await this.joinSplitVerifier.verifyProof(proofData.rawProofData))) {
      throw new Error('Join-split proof verification failed.');
    }

    if (publicInput > 0n) {
      if (!signature) {
        throw new Error('No deposit signature provided.');
      }

      if (!(await this.blockchain.validateSignature(inputOwner, signature, depositSigningData))) {
        throw new Error('Invalid deposit signature.');
      }

      // WARNING! Need to check the sum of all deposits in txs remains <= the amount pending deposit on contract.
      // As the db read of existing txs, and insertion of new tx, needs to be atomic, we have to mutex receiveTx.
      // TODO: Move to a system where you only ever deposit against a proof hash!
      const pendingTxs = await this.rollupDb.getUnsettledJoinSplitTxsForInputAddress(inputOwner);
      const total = pendingTxs.reduce((acc, tx) => acc + tx.publicInput, 0n) + publicInput;
      const pendingDeposit = await this.blockchain.getUserPendingDeposit(assetId, inputOwner);
      if (pendingDeposit < total) {
        throw new Error('Use insufficient pending deposit balance.');
      }
    }
  }

  private async validateAccountTx(proof: ProofData) {
    if (!(await this.accountVerifier.verifyProof(proof.rawProofData))) {
      throw new Error('Account proof verification failed.');
    }
  }
}
