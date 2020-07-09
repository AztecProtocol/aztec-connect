import createDebug from 'debug';
import { JoinSplitProver, JoinSplitTx, JoinSplitProof } from 'barretenberg/client_proofs/join_split_proof';
import { Note, encryptNote, createNoteSecret } from 'barretenberg/client_proofs/note';
import { Proof } from 'barretenberg/rollup_provider';
import { WorldState } from 'barretenberg/world_state';
import { UserState } from '../user_state';
import { randomBytes } from 'crypto';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { ethers } from 'ethers';
import { User } from '../user';
import { Signer } from '../sdk';

const debug = createDebug('bb:join_split_proof');

export type JoinSplitProofOutput = {
  proof: Proof;
  inputNote1?: number;
  inputNote2?: number;
  outputNote1?: Buffer;
  outputNote2?: Buffer;
};

export class JoinSplitProofCreator {
  constructor(private joinSplitProver: JoinSplitProver, private worldState: WorldState, private grumpkin: Grumpkin) {}

  public async createProof(
    userState: UserState,
    deposit: number,
    withdraw: number,
    transfer: number,
    sender: User,
    receiverPubKey: Buffer,
    signer?: Signer,
  ) {
    const requiredInputNoteValue = Math.max(0, transfer + withdraw - deposit);
    const notes = userState.pickNotes(requiredInputNoteValue);
    if (!notes) {
      throw new Error(`Failed to find no more than 2 notes that sum to ${requiredInputNoteValue}.`);
    }
    const numInputNotes = notes.length;

    while (notes.length < 2) {
      notes.push({
        index: notes.length,
        note: new Note(sender.publicKey, createNoteSecret(), 0),
      });
    }

    const totalNoteInputValue = notes.reduce((sum, note) => sum + note.note.value, 0);
    const inputNoteIndices = notes.map(n => n.index);
    const inputNotes = notes.map(n => n.note);
    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.worldState.getHashPath(idx)));

    const sendValue = transfer + deposit;
    const changeValue = totalNoteInputValue - transfer - withdraw;
    const outputNoteOwner1 = sendValue ? receiverPubKey : undefined;
    const outputNoteOwner2 = changeValue ? sender.publicKey : undefined;
    const outputNotes = [
      new Note(outputNoteOwner1 || randomBytes(64), createNoteSecret(), sendValue),
      new Note(outputNoteOwner2 || randomBytes(64), createNoteSecret(), changeValue),
    ];

    const encViewingKey1 = encryptNote(outputNotes[0], this.grumpkin);
    const encViewingKey2 = encryptNote(outputNotes[1], this.grumpkin);
    const signature = this.joinSplitProver.sign4Notes([...inputNotes, ...outputNotes], sender.privateKey!);

    const dataRoot = this.worldState.getRoot();

    const tx = new JoinSplitTx(
      sender.publicKey,
      deposit,
      withdraw,
      numInputNotes,
      inputNoteIndices,
      dataRoot,
      inputNotePaths,
      inputNotes,
      outputNotes,
      signature,
      signer?.getAddress() || Buffer.alloc(20),
    );

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.joinSplitProver.createJoinSplitProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    const viewingKeys = [encViewingKey1, encViewingKey2];
    const joinSplitProof = new JoinSplitProof(proofData, viewingKeys);
    const { newNote1, newNote2 } = joinSplitProof;
    const depositSignature = deposit ? await this.ethSign(joinSplitProof.getDepositSigningData(), signer) : undefined;

    // Only return notes that belong to the user.
    return {
      proof: { proofData, viewingKeys, depositSignature },
      inputNote1: numInputNotes > 0 ? notes[0].index : undefined,
      inputNote2: numInputNotes > 1 ? notes[1].index : undefined,
      outputNote1: outputNoteOwner1?.equals(sender.publicKey) ? newNote1 : undefined,
      outputNote2: outputNoteOwner2?.equals(sender.publicKey) ? newNote2 : undefined,
    } as JoinSplitProofOutput;
  }

  private async ethSign(txPublicInputs: Buffer, signer?: Signer) {
    if (!signer) {
      throw new Error('Signer undefined.');
    }
    const msgHash = ethers.utils.keccak256(txPublicInputs);
    return await signer.signMessage(Buffer.from(msgHash.slice(2), 'hex'));
  }
}
