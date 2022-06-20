import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { JoinSplitProver, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainJoinSplitData } from '@aztec/barretenberg/offchain_tx_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { WorldState } from '@aztec/barretenberg/world_state';
import { CorePaymentTx } from '../core_tx';
import { Database } from '../database';
import { Note } from '../note';
import { UserData } from '../user';
import { JoinSplitTxFactory } from './join_split_tx_factory';
import { JoinSplitProofInput } from './proof_input';

const debug = createDebugLogger('bb:payment_proof_creator');

export class PaymentProofCreator {
  private txFactory: JoinSplitTxFactory;

  constructor(
    private prover: JoinSplitProver,
    noteAlgos: NoteAlgorithms,
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
    const proof = await this.prover.createProof(tx, signature!);
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
        this.txFactory.generateNewNote(valueNote, user.accountPrivateKey, {
          allowChain: proofData.allowChainFromNote1,
        }),
        this.txFactory.generateNewNote(changeNote, user.accountPrivateKey, {
          allowChain: proofData.allowChainFromNote2,
        }),
      ],
    };
  }
}
