import { Blockchain, TxType } from 'barretenberg/blockchain';
import { AccountVerifier } from 'barretenberg/client_proofs/account_proof';
import { JoinSplitVerifier } from 'barretenberg/client_proofs/join_split_proof';
import { ProofId, ProofData, JoinSplitProofData } from 'barretenberg/client_proofs/proof_data';
import { Crs } from 'barretenberg/crs';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { BarretenbergWorker } from 'barretenberg/wasm/worker';
import { createWorker, destroyWorker } from 'barretenberg/wasm/worker_factory';
import { TxDao } from './entity/tx';
import { RollupDb } from './rollup_db';
import { Mutex } from 'async-mutex';
import { ViewingKey } from 'barretenberg/viewing_key';
import { ProofGenerator } from 'halloumi/proof_generator';
import { TxFeeResolver } from './tx_fee_resolver';

export interface Tx {
  proofData: Buffer;
  viewingKeys: ViewingKey[];
  depositSignature?: Buffer;
}

export class TxReceiver {
  private worker!: BarretenbergWorker;
  private joinSplitVerifier!: JoinSplitVerifier;
  private accountVerifier!: AccountVerifier;
  private mutex = new Mutex();

  constructor(
    private barretenberg: BarretenbergWasm,
    private rollupDb: RollupDb,
    private blockchain: Blockchain,
    private proofGenerator: ProofGenerator,
    private txFeeResolver: TxFeeResolver,
  ) {}

  public async init() {
    const crs = new Crs(0);
    await crs.downloadG2Data();

    this.worker = await createWorker('0', this.barretenberg.module);

    const jsKey = await this.proofGenerator.getJoinSplitVk();
    this.joinSplitVerifier = new JoinSplitVerifier();
    await this.joinSplitVerifier.loadKey(this.worker, jsKey, crs.getG2Data());

    const accountKey = await this.proofGenerator.getAccountVk();
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

      if (await this.rollupDb.nullifiersExist(proof.nullifier1, proof.nullifier2)) {
        throw new Error('Nullifier already exists.');
      }

      // Check the proof is valid.
      switch (proof.proofId) {
        case ProofId.JOIN_SPLIT:
          await this.validateJoinSplitTx(proof, depositSignature);
          break;
        case ProofId.ACCOUNT:
          await this.validateAccountTx(proof);
          break;
      }

      const dataRootsIndex = await this.rollupDb.getDataRootsIndex(proof.noteTreeRoot);

      const txDao = new TxDao({
        id: proof.txId,
        proofData,
        viewingKey1: proof.proofId == ProofId.JOIN_SPLIT ? viewingKeys[0] : ViewingKey.EMPTY,
        viewingKey2: proof.proofId == ProofId.JOIN_SPLIT ? viewingKeys[1] : ViewingKey.EMPTY,
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

  private async getTxType(jsProofData: JoinSplitProofData) {
    const { publicInput, publicOutput, outputOwner } = jsProofData;

    const isContract = await this.blockchain.isContract(outputOwner);

    if (publicInput > 0) {
      return TxType.DEPOSIT;
    } else if (publicOutput > 0 && isContract) {
      return TxType.WITHDRAW_TO_CONTRACT;
    } else if (publicOutput > 0) {
      return TxType.WITHDRAW_TO_WALLET;
    } else {
      return TxType.TRANSFER;
    }
  }

  private async validateJoinSplitTx(proofData: ProofData, depositSignature?: Buffer) {
    const jsProofData = new JoinSplitProofData(proofData);
    const { publicInput, inputOwner, assetId, depositSigningData } = jsProofData;

    const txType = await this.getTxType(jsProofData);
    const minFee = this.txFeeResolver.getTxFee(assetId, txType);
    if (jsProofData.proofData.txFee < minFee) {
      throw new Error('Insufficient fee.');
    }

    if (!(await this.joinSplitVerifier.verifyProof(proofData.rawProofData))) {
      throw new Error('Join-split proof verification failed.');
    }

    if (publicInput > 0n) {
      const proofApproval = await this.blockchain.getUserProofApprovalStatus(inputOwner, depositSigningData);
      if (!depositSignature && !proofApproval) {
        throw new Error('Deposit proof not approved');
      } else if (!(await this.blockchain.validateSignature(inputOwner, depositSignature!, depositSigningData))) {
        throw new Error('Invalid deposit approval signature.');
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
