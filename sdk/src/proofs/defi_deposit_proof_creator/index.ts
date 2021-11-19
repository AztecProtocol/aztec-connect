import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { JoinSplitProver, JoinSplitTx, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainDefiDepositData, OffchainJoinSplitData } from '@aztec/barretenberg/offchain_tx_data';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { WorldState } from '@aztec/barretenberg/world_state';
import createDebug from 'debug';
import { Database } from '../../database';
import { Signer } from '../../signer';
import { UserState } from '../../user_state';
import { UserDefiTx, UserJoinSplitTx } from '../../user_tx';
import { JoinSplitTxFactory } from '../join_split_proof_creator/join_split_tx_factory';
import { DefiProofOutput, JoinSplitProofOutput } from '../proof_output';

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
    jsTxFee: bigint,
    signer: Signer,
    allowChain = false,
  ) {
    const user = userState.getUser();
    const txOutputs = await this.createTxs(
      userState,
      bridgeId,
      depositValue,
      txFee,
      jsTxFee,
      signer.getPublicKey(),
      allowChain,
    );

    let joinSplitProofOutput: JoinSplitProofOutput | undefined;
    if (txOutputs.length == 2) {
      const { tx, outputNotes, viewingKeys } = txOutputs[0];
      const proofData = await this.create(tx, signer);

      const { txId } = new ProofData(proofData);
      const txHash = new TxHash(txId);
      const assetId = bridgeId.inputAssetId;
      const privateInput = tx.inputNotes.reduce((sum, n) => sum + n.value, BigInt(0));
      const senderPrivateOutput = outputNotes.reduce((sum, n) => sum + n.value, BigInt(0));
      const userTx = new UserJoinSplitTx(
        txHash,
        user.id,
        assetId,
        BigInt(0),
        BigInt(0),
        privateInput,
        BigInt(0),
        senderPrivateOutput,
        undefined,
        undefined,
        true, // ownedByUser
        new Date(),
      );
      const offchainTxData = new OffchainJoinSplitData(viewingKeys);
      joinSplitProofOutput = new JoinSplitProofOutput(userTx, outputNotes, proofData, offchainTxData);
    }

    const { tx, outputNotes, viewingKeys, partialStateSecretEphPubKey } = txOutputs[txOutputs.length - 1];
    const proofData = await this.create(tx, signer);
    const { txId } = new ProofData(proofData);
    const txHash = new TxHash(txId);
    const {
      claimNote: { partialStateSecret },
    } = tx;
    const userTx = new UserDefiTx(txHash, user.id, bridgeId, depositValue, partialStateSecret, txFee, new Date());
    const partialState = this.noteAlgos.valueNotePartialCommitment(partialStateSecret, user.id);
    const offchainTxData = new OffchainDefiDepositData(
      bridgeId,
      partialState,
      partialStateSecretEphPubKey!,
      depositValue,
      txFee,
      viewingKeys[0], // contains [value, asset_id, nonce, creatorPubKey] of the change note (returned to the sender)
    );

    return new DefiProofOutput(userTx, outputNotes, proofData, offchainTxData, joinSplitProofOutput);
  }

  private async create(tx: JoinSplitTx, signer: Signer) {
    const signingData = await this.prover.computeSigningData(tx);
    const signature = await signer.signMessage(signingData);

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.prover.createProof(tx, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    return proofData;
  }

  private async createTxs(
    userState: UserState,
    bridgeId: BridgeId,
    defiDepositValue: bigint,
    txFee: bigint,
    jsTxFee: bigint,
    signingPubKey: GrumpkinAddress,
    allowChain: boolean,
  ) {
    const user = userState.getUser();
    const assetId = bridgeId.inputAssetId;

    // Create a defi deposit tx with 0 change value.
    // Or with positive change value if allowChain is true.
    {
      const privateInput = defiDepositValue + txFee;
      const notes = await userState.pickNotes(assetId, privateInput);
      if (!notes) {
        throw new Error(`Failed to find no more than 2 notes that sum to ${privateInput}.`);
      }

      const note = await userState.pickNote(assetId, privateInput);
      const inputNotes = note?.value === privateInput ? [note] : notes;
      const totalInputNoteValue = inputNotes.reduce((sum, note) => sum + note.value, BigInt(0));
      const changeValue = totalInputNoteValue - privateInput;

      if (!changeValue || allowChain) {
        const defiDepositTx = await this.txFactory.createTx(
          user,
          ProofId.DEFI_DEPOSIT,
          assetId,
          inputNotes,
          signingPubKey,
          {
            bridgeId,
            defiDepositValue,
            allowChain: allowChain ? 2 : 0,
          },
        );
        return [defiDepositTx];
      }
    }

    // Create a join split tx and a defi deposit tx.
    {
      const privateInput = defiDepositValue + txFee + jsTxFee;
      const notes = await userState.pickNotes(assetId, privateInput);
      if (!notes) {
        throw new Error(`Failed to find no more than 2 notes that sum to ${privateInput}.`);
      }

      const totalInputNoteValue = notes.reduce((sum, note) => sum + note.value, BigInt(0));
      const changeValue = totalInputNoteValue - privateInput;

      const joinSplitTx = await this.txFactory.createTx(user, ProofId.SEND, assetId, notes, signingPubKey, {
        outputNoteValue1: changeValue,
        outputNoteValue2: defiDepositValue + txFee,
        allowChain: 2,
      });

      // Use the second output note from the above j/s tx as the input note.
      const inputNote = this.txFactory.treeNoteToNote(joinSplitTx.outputNotes[1], user.privateKey, {
        allowChain: true,
      });

      const defiDepositTx = await this.txFactory.createTx(
        user,
        ProofId.DEFI_DEPOSIT,
        assetId,
        [inputNote],
        signingPubKey,
        {
          bridgeId,
          defiDepositValue,
        },
      );

      return [joinSplitTx, defiDepositTx];
    }
  }
}
