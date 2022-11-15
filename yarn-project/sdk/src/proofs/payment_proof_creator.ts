import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { JoinSplitProver, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainJoinSplitData } from '@aztec/barretenberg/offchain_tx_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { WorldState } from '@aztec/barretenberg/world_state';
import { CorePaymentTx } from '../core_tx/index.js';
import { Database } from '../database/index.js';
import { Note, treeNoteToNote } from '../note/index.js';
import { UserData } from '../user/index.js';
import { JoinSplitTxFactory } from './join_split_tx_factory.js';
import { JoinSplitProofInput } from './proof_input.js';

const debug = createDebugLogger('bb:payment_proof_creator');

export class PaymentProofCreator {
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
    user: UserData,
    inputNotes: Note[],
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    publicInput: bigint,
    publicOutput: bigint,
    assetId: number,
    newNoteOwner: GrumpkinAddress | undefined,
    newNoteOwnerAccountRequired: boolean,
    publicOwner: EthAddress | undefined,
    spendingPublicKey: GrumpkinAddress,
    allowChain: number,
  ) {
    if (publicInput && publicOutput) {
      throw new Error('Public values cannot be both greater than zero.');
    }

    if (publicOutput + recipientPrivateOutput + senderPrivateOutput > publicInput + privateInput) {
      throw new Error('Total output cannot be larger than total input.');
    }

    if (publicInput + publicOutput && !publicOwner) {
      throw new Error('Public owner undefined.');
    }

    if (recipientPrivateOutput && !newNoteOwner) {
      throw new Error('Note recipient undefined.');
    }

    if (inputNotes.length > 2) {
      throw new Error('Cannot create a proof with more than 2 input notes.');
    }

    const accountRequired = !spendingPublicKey.equals(user.accountPublicKey);
    if (inputNotes.some(n => n.treeNote.accountRequired !== accountRequired)) {
      throw new Error(`Cannot spend notes with ${accountRequired ? 'account' : 'spending'} key.`);
    }

    const proofId = (() => {
      if (publicInput > 0) {
        return ProofId.DEPOSIT;
      }
      if (publicOutput > 0) {
        return ProofId.WITHDRAW;
      }
      return ProofId.SEND;
    })();

    const totalInputNoteValue = inputNotes.reduce((sum, note) => sum + note.value, BigInt(0));
    if (totalInputNoteValue && proofId === ProofId.DEPOSIT) {
      // TODO - Enable it and modify the recovery logic in group_user_txs.
      throw new Error('Merging private balance with public balance is not supported.');
    }
    const changeValue = totalInputNoteValue > privateInput ? totalInputNoteValue - privateInput : BigInt(0);

    const proofInput = await this.txFactory.createTx(user, proofId, assetId, inputNotes, spendingPublicKey, {
      publicValue: publicInput + publicOutput,
      publicOwner,
      outputNoteValue1: recipientPrivateOutput,
      outputNoteValue2: changeValue + senderPrivateOutput,
      newNoteOwner,
      newNoteOwnerAccountRequired,
      allowChain,
    });

    const signingData = await this.prover.computeSigningData(proofInput.tx);

    return { ...proofInput, signingData };
  }

  public async createProof(user: UserData, { tx, signature, viewingKeys }: JoinSplitProofInput, txRefNo: number) {
    debug('creating proof...');
    const start = new Date().getTime();
    tx.signature = signature!;
    const proof = await this.prover.createProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const proofData = new ProofData(proof);
    const txId = new TxId(proofData.txId);

    const {
      inputNotes,
      outputNotes: [valueNote, changeNote],
      proofId,
      publicValue,
      publicOwner,
    } = tx;
    const privateInput = inputNotes.reduce((sum, n) => sum + n.value, BigInt(0));
    const { value: recipientPrivateOutput } = valueNote;
    const { assetId, value: senderPrivateOutput } = changeNote;
    const newNoteOwner = valueNote.ownerPubKey;
    const userId = changeNote.ownerPubKey;
    const isRecipient = newNoteOwner.equals(userId);
    const isSender = true;
    const coreTx = new CorePaymentTx(
      txId,
      userId,
      proofId,
      assetId,
      publicValue,
      publicOwner,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      isRecipient,
      isSender,
      txRefNo,
      new Date(),
    );
    const offchainTxData = new OffchainJoinSplitData(viewingKeys, txRefNo);

    return {
      tx: coreTx,
      proofData,
      offchainTxData,
      outputNotes: [
        treeNoteToNote(valueNote, user.accountPrivateKey, this.noteAlgos, {
          allowChain: proofData.allowChainFromNote1,
        }),
        treeNoteToNote(changeNote, user.accountPrivateKey, this.noteAlgos, {
          allowChain: proofData.allowChainFromNote2,
        }),
      ],
    };
  }
}
