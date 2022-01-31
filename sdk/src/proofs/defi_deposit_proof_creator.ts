import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { JoinSplitProver, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { NoteAlgorithms, TreeNote } from '@aztec/barretenberg/note_algorithms';
import { OffchainDefiDepositData } from '@aztec/barretenberg/offchain_tx_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { WorldState } from '@aztec/barretenberg/world_state';
import createDebug from 'debug';
import { CoreDefiTx } from '../core_tx';
import { Database } from '../database';
import { Signer } from '../signer';
import { UserState } from '../user_state';
import { JoinSplitTxFactory } from './join_split_tx_factory';
import { ProofOutput } from './proof_output';

const debug = createDebug('bb:defi_deposit_proof_creator');

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

  public async createProof(
    userState: UserState,
    bridgeId: BridgeId,
    depositValue: bigint,
    txFee: bigint,
    signer: Signer,
    inputNotes: TreeNote[] | undefined,
    txRefNo: number,
  ): Promise<ProofOutput> {
    const user = userState.getUser();
    const assetId = bridgeId.inputAssetId;
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

    const { tx, outputNotes, viewingKeys, partialStateSecretEphPubKey } = await this.txFactory.createTx(
      user,
      ProofId.DEFI_DEPOSIT,
      assetId,
      notes,
      signer.getPublicKey(),
      {
        bridgeId,
        defiDepositValue: depositValue,
      },
    );

    const signingData = await this.prover.computeSigningData(tx);
    const signature = await signer.signMessage(signingData);

    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await this.prover.createProof(tx, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const proofData = new ProofData(proof);
    const txId = new TxId(proofData.txId);
    const {
      claimNote: { partialStateSecret },
    } = tx;
    const coreTx = new CoreDefiTx(
      txId,
      user.id,
      bridgeId,
      depositValue,
      txFee,
      partialStateSecret,
      txRefNo,
      new Date(),
    );
    const partialState = this.noteAlgos.valueNotePartialCommitment(partialStateSecret, user.id);
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
