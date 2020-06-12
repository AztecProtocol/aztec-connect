import createDebug from 'debug';
import { JoinSplitProver, JoinSplitTx, JoinSplitProof } from 'barretenberg-es/client_proofs/join_split_proof';
import { Note, encryptNote, createNoteSecret } from 'barretenberg-es/client_proofs/note';
import { WorldState } from 'barretenberg-es/world_state';
import { UserState } from '../user_state';
import { randomBytes, createHash } from 'crypto';
import { Grumpkin } from 'barretenberg-es/ecc/grumpkin';
import { User } from '../user';

const debug = createDebug('bb:join_split_proof');

const toAddress = (pubKey: Buffer) => createHash('sha256').update(pubKey).digest().slice(-20);

export class JoinSplitProofCreator {
  constructor(
    private joinSplitProver: JoinSplitProver,
    private userState: UserState,
    private worldState: WorldState,
    private grumpkin: Grumpkin,
  ) {}

  public async createProof(
    deposit: number,
    withdraw: number,
    transfer: number,
    sender: User,
    receiverPubKey: Buffer,
    publicOwnerAddress?: Buffer,
  ) {
    const requiredInputNoteValue = Math.max(0, transfer + withdraw - deposit);
    const notes = this.userState.pickNotes(requiredInputNoteValue);
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
      publicOwnerAddress || toAddress(sender.publicKey),
    );

    debug(tx);

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.joinSplitProver.createJoinSplitProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);
    debug(proofData);

    const viewingKeys = [encViewingKey1, encViewingKey2];
    const joinSplitProof = new JoinSplitProof(proofData, viewingKeys);
    debug(joinSplitProof);
    const { newNote1, newNote2 } = joinSplitProof;

    // Only return notes that belong to the user.
    return {
      proof: { proofData, viewingKeys },
      inputNote1: numInputNotes > 0 ? notes[0].index : undefined,
      inputNote2: numInputNotes > 1 ? notes[1].index : undefined,
      outputNote1: outputNoteOwner1?.equals(sender.publicKey) ? newNote1 : undefined,
      outputNote2: outputNoteOwner2?.equals(sender.publicKey) ? newNote2 : undefined,
    };
  }
}
