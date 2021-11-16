import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import {
  AccountVerifier,
  DefiDepositProofData,
  JoinSplitProofData,
  JoinSplitVerifier,
  ProofData,
  ProofId,
} from '@aztec/barretenberg/client_proofs';
import { Crs } from '@aztec/barretenberg/crs';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
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
    private noteAlgo: NoteAlgorithms,
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
      const proof = new ProofData(proofData);
      const txType = await getTxTypeFromProofData(proof, this.blockchain);
      this.metrics.txReceived(txType);

      console.log(`Received tx: ${proof.txId.toString('hex')}`);

      if (await this.rollupDb.nullifiersExist(proof.nullifier1, proof.nullifier2)) {
        throw new Error('Nullifier already exists.');
      }

      // Check the proof is valid.
      switch (proof.proofId) {
        case ProofId.DEPOSIT:
        case ProofId.WITHDRAW:
        case ProofId.SEND:
          await this.validateJoinSplitTx(proof, txType, depositSignature);
          break;
        case ProofId.ACCOUNT: {
          const offchainData = OffchainAccountData.fromBuffer(offchainTxData);
          await this.validateAccountTx(proof, offchainData);
          break;
        }
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
        signature: proof.proofId === ProofId.DEPOSIT ? depositSignature : undefined,
        nullifier1: toBigIntBE(proof.nullifier1) ? proof.nullifier1 : undefined,
        nullifier2: toBigIntBE(proof.nullifier2) ? proof.nullifier2 : undefined,
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

  private async validateJoinSplitTx(proofData: ProofData, txType: TxType, depositSignature?: Buffer) {
    const { publicAssetId: assetId, txId, txFeeAssetId, txFee, publicOwner, publicValue } = new JoinSplitProofData(
      proofData,
    );

    const minFee = this.txFeeResolver.getMinTxFee(txFeeAssetId, txType);
    if (txFee < minFee) {
      throw new Error('Insufficient fee.');
    }

    if (!(await this.joinSplitVerifier.verifyProof(proofData.rawProofData))) {
      throw new Error('Join-split proof verification failed.');
    }

    if (proofData.proofId === ProofId.DEPOSIT) {
      let proofApproval = await this.blockchain.getUserProofApprovalStatus(publicOwner, txId);

      if (!proofApproval && depositSignature) {
        const message = Buffer.concat([
          Buffer.from('Signing this message will allow your pending funds to be spent in Aztec transaction:\n'),
          txId,
          Buffer.from('\nIMPORTANT: Only sign the message if you trust the client'),
        ]);
        proofApproval = this.blockchain.validateSignature(publicOwner, depositSignature, message);
      }
      if (!proofApproval) {
        throw new Error(`Tx not approved or invalid signature: ${txId.toString('hex')}`);
      }

      // WARNING! Need to check the sum of all deposits in txs remains <= the amount pending deposit on contract.
      // As the db read of existing txs, and insertion of new tx, needs to be atomic, we have to mutex receiveTx.
      // TODO: Move to a system where you only ever deposit against a proof hash!
      const total =
        (await this.rollupDb.getUnsettledJoinSplitTxs())
          .map(tx => JoinSplitProofData.fromBuffer(tx.proofData))
          .filter(proofData => proofData.publicOwner.equals(publicOwner) && proofData.publicAssetId === assetId)
          .reduce((acc, proofData) => acc + proofData.publicValue, 0n) + publicValue;

      const pendingDeposit = await this.blockchain.getUserPendingDeposit(assetId, publicOwner);

      if (pendingDeposit < total) {
        throw new Error('User insufficient pending deposit balance.');
      }
    }
  }

  private async validateAccountTx(proof: ProofData, offchainData: OffchainAccountData) {
    const { accountPublicKey, accountAliasId, spendingPublicKey1, spendingPublicKey2 } = offchainData;
    const expectedCommitments = [proof.noteCommitment1, proof.noteCommitment2];
    [spendingPublicKey1, spendingPublicKey2].forEach((spendingKey, i) => {
      const commitment = this.noteAlgo.accountNoteCommitment(accountAliasId, accountPublicKey, spendingKey);
      if (!commitment.equals(expectedCommitments[i])) {
        throw new Error('Invalid offchain account data.');
      }
    });

    if (!(await this.accountVerifier.verifyProof(proof.rawProofData))) {
      throw new Error('Account proof verification failed.');
    }
  }

  private async validateDefiBridgeTx(proofData: ProofData, txType: TxType) {
    const { txFeeAssetId, txFee } = new DefiDepositProofData(proofData);

    // TODO - Use a whitelist for bridges.

    const minFee = this.txFeeResolver.getMinTxFee(txFeeAssetId, txType);
    if (txFee < minFee) {
      throw new Error('Insufficient fee.');
    }

    if (!(await this.joinSplitVerifier.verifyProof(proofData.rawProofData))) {
      throw new Error('Defi-bridge proof verification failed.');
    }
  }
}
