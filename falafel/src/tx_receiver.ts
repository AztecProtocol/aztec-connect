import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import {
  AccountVerifier,
  ClientProofData,
  DefiDepositClientProofData,
  JoinSplitClientProofData,
  JoinSplitVerifier,
  ProofId,
} from '@aztec/barretenberg/client_proofs';
import { Crs } from '@aztec/barretenberg/crs';
import { BarretenbergWasm, BarretenbergWorker, createWorker, destroyWorker } from '@aztec/barretenberg/wasm';
import { Mutex } from 'async-mutex';
import { ProofGenerator } from 'halloumi/proof_generator';
import { TxDao } from './entity/tx';
import { getTxTypeFromProofData } from './get_tx_type';
import { Metrics } from './metrics';
import { RollupDb } from './rollup_db';
import { TxFeeResolver } from './tx_fee_resolver';

export interface Tx {
  proofData: Buffer;
  offchainTxData: Buffer;
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
    private metrics: Metrics,
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

  public async receiveTx({ proofData, depositSignature, offchainTxData }: Tx) {
    // We mutex this entire receive call until we move to "deposit to proof hash". Read more below.
    await this.mutex.acquire();
    try {
      const proof = new ClientProofData(proofData);
      const txType = await getTxTypeFromProofData(proof, this.blockchain);
      this.metrics.txReceived(txType);

      console.log(`Received tx: ${proof.txId.toString('hex')}`);

      if (await this.rollupDb.nullifiersExist(proof.nullifier1, proof.nullifier2)) {
        throw new Error('Nullifier already exists.');
      }
      // Check the proof is valid.
      switch (proof.proofId) {
        case ProofId.JOIN_SPLIT: {
          await this.validateJoinSplitTx(proof, txType, depositSignature);
          break;
        }
        case ProofId.ACCOUNT:
          await this.validateAccountTx(proof);
          break;
        case ProofId.DEFI_DEPOSIT:
          await this.validateDefiBridgeTx(proof, txType);
          break;
        default:
          throw new Error('Unknown proof id.');
      }

      const dataRootsIndex = await this.rollupDb.getDataRootsIndex(proof.noteTreeRoot);

      const txDao = new TxDao({
        id: proof.txId,
        proofData,
        offchainTxData,
        signature: depositSignature,
        nullifier1: proof.nullifier1,
        nullifier2: proof.nullifier2,
        dataRootsIndex,
        created: new Date(),
        txType,
      });

      await this.rollupDb.addTx(txDao);

      return proof.txId;
    } finally {
      this.mutex.release();
    }
  }

  private async validateJoinSplitTx(proofData: ClientProofData, txType: TxType, depositSignature?: Buffer) {
    const { publicInput, inputOwner, assetId, txId, txFee } = new JoinSplitClientProofData(proofData);

    const minFee = this.txFeeResolver.getMinTxFee(assetId, txType);
    if (txFee < minFee) {
      throw new Error('Insufficient fee.');
    }

    if (!(await this.joinSplitVerifier.verifyProof(proofData.rawProofData))) {
      throw new Error('Join-split proof verification failed.');
    }

    if (publicInput > 0n) {
      let proofApproval = await this.blockchain.getUserProofApprovalStatus(inputOwner, txId);

      if (!proofApproval && depositSignature) {
        proofApproval = this.blockchain.validateSignature(inputOwner, depositSignature, txId);
      }
      if (!proofApproval) {
        throw new Error(`Tx not approved or invalid signature: ${txId.toString('hex')}`);
      }

      // WARNING! Need to check the sum of all deposits in txs remains <= the amount pending deposit on contract.
      // As the db read of existing txs, and insertion of new tx, needs to be atomic, we have to mutex receiveTx.
      // TODO: Move to a system where you only ever deposit against a proof hash!
      const total =
        (await this.rollupDb.getUnsettledJoinSplitTxs())
          .map(tx => JoinSplitClientProofData.fromBuffer(tx.proofData))
          .filter(proofData => proofData.inputOwner.equals(inputOwner) && proofData.assetId === assetId)
          .reduce((acc, proofData) => acc + proofData.publicInput, 0n) + publicInput;

      const pendingDeposit = await this.blockchain.getUserPendingDeposit(assetId, inputOwner);

      if (pendingDeposit < total) {
        throw new Error('User insufficient pending deposit balance.');
      }
    }
  }

  private async validateAccountTx(proof: ClientProofData) {
    if (!(await this.accountVerifier.verifyProof(proof.rawProofData))) {
      throw new Error('Account proof verification failed.');
    }
  }

  private async validateDefiBridgeTx(proofData: ClientProofData, txType: TxType) {
    const { bridgeId, txFee } = new DefiDepositClientProofData(proofData);

    // TODO - Use a whitelist.
    const remoteBridgeId = await this.blockchain.getBridgeId(bridgeId.address);
    if (!bridgeId.equals(remoteBridgeId)) {
      throw new Error('Invalid bridge id.');
    }

    const minFee = this.txFeeResolver.getMinTxFee(bridgeId.inputAssetId, txType);
    if (txFee < minFee) {
      throw new Error('Insufficient fee.');
    }

    if (!(await this.joinSplitVerifier.verifyProof(proofData.rawProofData))) {
      throw new Error('Defi-bridge proof verification failed.');
    }
  }
}
