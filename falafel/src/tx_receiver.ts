import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { BridgeConfig } from '@aztec/barretenberg/bridge_id';
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
  proof: ProofData;
  offchainTxData: Buffer;
  depositSignature?: Buffer;
  parentTx?: Tx;
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
    private bridgeConfigs: BridgeConfig[],
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

  public async receiveTx(tx: Tx) {
    // We mutex this entire receive call until we move to "deposit to proof hash". Read more below.
    await this.mutex.acquire();
    try {
      const txs: TxDao[] = [];

      const processTx = async (tx: Tx) => {
        if (tx.parentTx) {
          if (tx.parentTx.proof.proofId === ProofId.DEPOSIT) {
            // Do not allow a deposit tx to be in the chain
            // so that we don't have to accumulate all deposits and check the total value against the pending deposit.
            throw new Error('Invalid parent tx type.');
          }
          await processTx(tx.parentTx);
        }

        const txType = await getTxTypeFromProofData(tx.proof, this.blockchain);
        this.metrics.txReceived(txType);
        console.log(`Received tx: ${tx.proof.txId.toString('hex')}, type: ${TxType[txType]}`);

        txs.push(await this.validateTx(tx));
      };

      await processTx(tx);

      await this.rollupDb.addTxs(txs);

      return txs[txs.length - 1].id;
    } finally {
      this.mutex.release();
    }
  }

  private async validateTx({ proof, offchainTxData, depositSignature, parentTx }: Tx) {
    const findParent = (cb: (p: Tx) => boolean, p = parentTx) => {
      if (p?.parentTx && findParent(cb, p.parentTx)) {
        return true;
      }
      return p ? cb(p) : false;
    };

    if (
      (await this.rollupDb.nullifiersExist(proof.nullifier1, proof.nullifier2)) ||
      findParent(p =>
        [p.proof.nullifier1, p.proof.nullifier2]
          .filter(n => !!toBigIntBE(n))
          .some(n => n.equals(proof.nullifier1) || n.equals(proof.nullifier2)),
      )
    ) {
      throw new Error('Nullifier already exists.');
    }

    const { backwardLink } = proof;
    if (!backwardLink.equals(Buffer.alloc(32))) {
      const unsettledTxs = (await this.rollupDb.getUnsettledTxs()).map(({ proofData }) => new ProofData(proofData));
      if (
        unsettledTxs.some(tx => tx.backwardLink.equals(backwardLink)) ||
        findParent(p => p.proof.backwardLink.equals(backwardLink))
      ) {
        throw new Error('Duplicated backward link.');
      }

      const linkedTx =
        findParent(p => [p.proof.noteCommitment1, p.proof.noteCommitment2].some(nc => nc.equals(backwardLink))) ||
        unsettledTxs.some(
          tx =>
            (tx.allowChainFromNote1 && tx.noteCommitment1.equals(backwardLink)) ||
            (tx.allowChainFromNote2 && tx.noteCommitment2.equals(backwardLink)),
        );
      if (!linkedTx) {
        throw new Error('Linked tx not found.');
      }
    }

    const txType = await getTxTypeFromProofData(proof, this.blockchain);

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
    });
  }

  private async validateJoinSplitTx(proofData: ProofData, txType: TxType, depositSignature?: Buffer) {
    const {
      publicAssetId: assetId,
      txId,
      txFeeAssetId,
      txFee,
      publicOwner,
      publicValue,
    } = new JoinSplitProofData(proofData);

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

  private async validateDefiBridgeTx(proofData: ProofData) {
    const { bridgeId, txFeeAssetId, txFee } = new DefiDepositProofData(proofData);

    const bridgeConfig = this.bridgeConfigs.find(bc => bc.bridgeId.equals(bridgeId));

    if (!bridgeConfig) {
      console.log(`Unrecognised Defi bridge: ${bridgeId.toString()}`);
      throw new Error('Unrecognised Defi-bridge');
    }

    const numBridgeTxs = BigInt(bridgeConfig.numTxs);
    let requiredGas = BigInt(this.txFeeResolver.getBaseTxGas()) + bridgeConfig.fee / numBridgeTxs;
    if (bridgeConfig.fee % numBridgeTxs > 0n) {
      requiredGas++;
    }
    const providedGas = this.txFeeResolver.getGasPaidForByFee(txFeeAssetId, txFee);
    if (providedGas < requiredGas) {
      console.log(`Defi tx only contained enough fee to pay for ${providedGas} gas, but it needed ${requiredGas}`);
      throw new Error('Insufficient fee');
    }

    if (!(await this.joinSplitVerifier.verifyProof(proofData.rawProofData))) {
      throw new Error('Defi-bridge proof verification failed.');
    }
  }
}
