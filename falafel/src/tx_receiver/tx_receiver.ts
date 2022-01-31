import { EthAddress } from '@aztec/barretenberg/address';
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
import { BridgeResolver } from '../bridge';
import { TxDao } from '../entity/tx';
import { getTxTypeFromProofData } from '../get_tx_type';
import { Metrics } from '../metrics';
import { RollupDb } from '../rollup_db';
import { TxFeeResolver } from '../tx_fee_resolver';
import { TxFeeAllocator, Tx } from '.';

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
    private bridgeResolver: BridgeResolver,
    private proverless = false,
  ) {}

  public async init() {
    if (this.proverless) {
      return;
    }

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

  public async receiveTxs(txs: Tx[]) {
    // We mutex this entire receive call until we move to "deposit to proof hash". Read more below.
    await this.mutex.acquire();
    try {
      const txTypes: TxType[] = [];
      for (let i = 0; i < txs.length; ++i) {
        const { proof } = txs[i];
        const txType = await getTxTypeFromProofData(proof, this.blockchain);
        this.metrics.txReceived(txType);
        console.log(`Received tx (${i + 1}/${txs.length}): ${proof.txId.toString('hex')}, type: ${TxType[txType]}`);
        txTypes.push(txType);
      }

      const feeAllocator = new TxFeeAllocator(this.txFeeResolver);
      const validation = feeAllocator.validateReceivedTxs(txs, txTypes);
      if (validation.gasProvided < validation.gasRequired) {
        console.log(
          `Txs only contained enough fee to pay for ${validation.gasProvided} gas, but it needed ${validation.gasRequired}.`,
        );
        throw new Error('Insufficient fee.');
      }

      await this.validateRequiredDeposit(txs);

      const txDaos: TxDao[] = [];
      for (let i = 0; i < txs.length; ++i) {
        const tx = txs[i];
        txDaos.push(await this.validateTx(tx, txTypes[i], txs.slice(0, i)));
      }
      feeAllocator.reallocateGas(txDaos, txs, txTypes, validation);
      await this.rollupDb.addTxs(txDaos);

      return txDaos.map(txDao => txDao.id);
    } finally {
      this.mutex.release();
    }
  }

  private async validateTx({ proof, offchainTxData, depositSignature }: Tx, txType: TxType, precedingTxs: Tx[]) {
    if (
      (await this.rollupDb.nullifiersExist(proof.nullifier1, proof.nullifier2)) ||
      precedingTxs.some(p =>
        [p.proof.nullifier1, p.proof.nullifier2]
          .filter(n => !!toBigIntBE(n))
          .some(n => n.equals(proof.nullifier1) || n.equals(proof.nullifier2)),
      )
    ) {
      throw new Error('Nullifier already exists.');
    }

    const { backwardLink } = proof;
    if (!backwardLink.equals(Buffer.alloc(32))) {
      const unsettledTxs = [
        ...(await this.rollupDb.getUnsettledTxs()).map(({ proofData }) => new ProofData(proofData)),
        ...precedingTxs.map(p => p.proof),
      ];
      if (unsettledTxs.some(tx => tx.backwardLink.equals(backwardLink))) {
        throw new Error('Duplicated backward link.');
      }

      const linkedTx = unsettledTxs.some(
        tx =>
          (tx.allowChainFromNote1 && tx.noteCommitment1.equals(backwardLink)) ||
          (tx.allowChainFromNote2 && tx.noteCommitment2.equals(backwardLink)),
      );
      if (!linkedTx) {
        throw new Error('Linked tx not found.');
      }
    }

    // Check the proof is valid.
    switch (proof.proofId) {
      case ProofId.DEPOSIT:
      case ProofId.WITHDRAW:
      case ProofId.SEND:
        await this.validateJoinSplitTx(proof, depositSignature);
        break;
      case ProofId.ACCOUNT: {
        const offchainData = OffchainAccountData.fromBuffer(offchainTxData);
        await this.validateAccountTx(proof, offchainData);
        break;
      }
      case ProofId.DEFI_DEPOSIT:
        await this.validateDefiBridgeTx(proof);
        break;
      default:
        throw new Error('Unknown proof id.');
    }

    const dataRootsIndex = await this.rollupDb.getDataRootsIndex(proof.noteTreeRoot);
    return new TxDao({
      id: proof.txId,
      proofData: proof.rawProofData,
      offchainTxData,
      signature: proof.proofId === ProofId.DEPOSIT ? depositSignature : undefined,
      nullifier1: toBigIntBE(proof.nullifier1) ? proof.nullifier1 : undefined,
      nullifier2: toBigIntBE(proof.nullifier2) ? proof.nullifier2 : undefined,
      dataRootsIndex,
      created: new Date(),
      txType,
      excessGas: 0n, // provided later
    });
  }

  private async validateJoinSplitTx(proof: ProofData, depositSignature?: Buffer) {
    if (proof.proofId === ProofId.DEPOSIT) {
      const { txId, publicOwner } = new JoinSplitProofData(proof);
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
    }

    if (!this.proverless && !(await this.joinSplitVerifier.verifyProof(proof.rawProofData))) {
      throw new Error('Join-split proof verification failed.');
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

    if (!this.proverless && !(await this.accountVerifier.verifyProof(proof.rawProofData))) {
      throw new Error('Account proof verification failed.');
    }
  }

  private async validateDefiBridgeTx(proofData: ProofData) {
    if (proofData.allowChainFromNote1 || proofData.allowChainFromNote2) {
      throw new Error('Cannot chain from a defi deposit tx.');
    }

    const { bridgeId } = new DefiDepositProofData(proofData);
    const bridgeConfig = this.bridgeResolver.getBridgeConfig(bridgeId.toBigInt());
    if (!bridgeConfig) {
      console.log(`Unrecognised Defi bridge: ${bridgeId.toString()}`);
      throw new Error('Unrecognised Defi-bridge');
    }

    if (!this.proverless && !(await this.joinSplitVerifier.verifyProof(proofData.rawProofData))) {
      throw new Error('Defi-bridge proof verification failed.');
    }
  }

  private async validateRequiredDeposit(txs: Tx[]) {
    const depositProofs = txs
      .filter(tx => tx.proof.proofId === ProofId.DEPOSIT)
      .map(tx => new JoinSplitProofData(tx.proof));
    if (!depositProofs.length) {
      return;
    }

    const requiredDeposits: { publicOwner: EthAddress; publicAssetId: number; value: bigint }[] = [];
    depositProofs.forEach(({ publicAssetId, publicOwner, publicValue }) => {
      const index = requiredDeposits.findIndex(
        d => d.publicOwner.equals(publicOwner) && d.publicAssetId === publicAssetId,
      );
      if (index < 0) {
        requiredDeposits.push({ publicOwner, publicAssetId, value: publicValue });
      } else {
        requiredDeposits[index] = { publicOwner, publicAssetId, value: requiredDeposits[index].value + publicValue };
      }
    });

    const unsettledTxs = (await this.rollupDb.getUnsettledPaymentTxs()).map(tx =>
      JoinSplitProofData.fromBuffer(tx.proofData),
    );

    for (const { publicOwner, publicAssetId, value } of requiredDeposits) {
      // WARNING! Need to check the sum of all deposits in txs remains <= the amount pending deposit on contract.
      // As the db read of existing txs, and insertion of new tx, needs to be atomic, we have to mutex receiveTx.
      const total =
        value +
        unsettledTxs
          .filter(tx => tx.publicOwner.equals(publicOwner) && tx.publicAssetId === publicAssetId)
          .reduce((acc, tx) => acc + tx.publicValue, 0n);
      const pendingDeposit = await this.blockchain.getUserPendingDeposit(publicAssetId, publicOwner);
      if (pendingDeposit < total) {
        throw new Error('User insufficient pending deposit balance.');
      }
    }
  }
}
