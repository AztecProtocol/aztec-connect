import { AccountId } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { JoinSplitProver, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { NoteAlgorithms, TreeNote } from '@aztec/barretenberg/note_algorithms';
import { OffchainDefiDepositData } from '@aztec/barretenberg/offchain_tx_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { WorldState } from '@aztec/barretenberg/world_state';
import { createLogger } from '@aztec/barretenberg/debug';
import { CoreDefiTx } from '../core_tx';
import { Database } from '../database';
import { UserState } from '../user_state';
import { JoinSplitTxFactory } from './join_split_tx_factory';
import { JoinSplitProofInput } from './proof_input';

const debug = createLogger('bb:defi_deposit_proof_creator');

export class DefiDepositProofCreator {
  private txFactory: JoinSplitTxFactory;

  constructor(
    private prover: JoinSplitProver,
    private noteAlgos: NoteAlgorithms,
    worldState: WorldState,
    grumpkin: Grumpkin,
    db: Database,
  ) {
    this.txFactory = new JoinSplitTxFactory(noteAlgos, worldState, grumpkin, db);
  }

  public async createProofInput(
    userState: UserState,
    bridgeId: BridgeId,
    depositValue: bigint,
    txFee: bigint,
    inputNotes: TreeNote[] | undefined,
    spendingPublicKey: GrumpkinAddress,
  ) {
    const user = userState.getUser();
    const assetId = bridgeId.inputAssetIdA;
    const privateInput = depositValue + txFee;

    const notes = inputNotes
      ? inputNotes.map(note =>
          this.txFactory.treeNoteToNote(note, user.privateKey, {
            allowChain: true,
          }),
        )
      : await userState.pickNotes(assetId, privateInput);
    if (!notes) {
      throw new Error(`Failed to find no more than 2 notes that sum to ${privateInput}.`);
    }

    const proofInput = await this.txFactory.createTx(user, ProofId.DEFI_DEPOSIT, assetId, notes, spendingPublicKey, {
      bridgeId,
      defiDepositValue: depositValue,
    });

    const signingData = await this.prover.computeSigningData(proofInput.tx);

    return { ...proofInput, signingData };
  }

  public async createProof(
    { tx, signature, partialStateSecretEphPubKey, viewingKeys }: JoinSplitProofInput,
    txRefNo: number,
  ) {
    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await this.prover.createProof(tx, signature!);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const proofData = new ProofData(proof);
    const txId = new TxId(proofData.txId);
    const {
      outputNotes,
      claimNote: { value: depositValue, bridgeId, partialStateSecret },
      inputNotes,
    } = tx;
    const { ownerPubKey, nonce } = outputNotes[1];
    const userId = new AccountId(ownerPubKey, nonce);
    const privateInput = inputNotes.reduce((sum, n) => sum + n.value, BigInt(0));
    const txFee = privateInput - depositValue;
    const coreTx = new CoreDefiTx(txId, userId, bridgeId, depositValue, txFee, partialStateSecret, txRefNo, new Date());
    const partialState = this.noteAlgos.valueNotePartialCommitment(partialStateSecret, userId);
    const offchainTxData = new OffchainDefiDepositData(
      bridgeId,
      partialState,
      partialStateSecretEphPubKey!,
      depositValue,
      txFee,
      viewingKeys[0], // contains [value, asset_id, nonce, creatorPubKey] of the change note (returned to the sender)
      txRefNo,
    );

    return { tx: coreTx, proofData, offchainTxData, outputNotes };
  }
}
