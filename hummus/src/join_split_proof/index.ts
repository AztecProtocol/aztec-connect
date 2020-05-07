import createDebug from 'debug';
import { JoinSplitProver, JoinSplitTx } from 'barretenberg-es/client_proofs/join_split_proof';
import { Note, encryptNote, createNoteSecret } from 'barretenberg-es/client_proofs/note';
import { WorldState } from 'barretenberg-es/world_state';
import { UserState } from '../user_state';
import { randomBytes } from 'crypto';
import { Grumpkin } from 'barretenberg-es/ecc/grumpkin';
import { Proof } from 'barretenberg-es/rollup_provider/rollup_provider';
import { User } from '../user';

const debug = createDebug('bb:join_split_proof');

export class JoinSplitProofCreator {
  constructor(
    private joinSplitProver: JoinSplitProver,
    private userState: UserState,
    private worldState: WorldState,
    private grumpkin: Grumpkin,
  ) {}

  public async createProof(deposit: number, widthraw: number, transfer: number, sender: User, receiverPubKey: Buffer) {
    const requiredInputNoteValue = Math.max(0, transfer + widthraw - deposit);
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
    const changeValue = totalNoteInputValue - transfer - widthraw;
    const outputNotes = [
      new Note(sendValue ? receiverPubKey : randomBytes(64), createNoteSecret(), sendValue),
      new Note(changeValue ? sender.publicKey : randomBytes(64), createNoteSecret(), changeValue),
    ];

    const encViewingKey1 = encryptNote(outputNotes[0], this.grumpkin);
    const encViewingKey2 = encryptNote(outputNotes[1], this.grumpkin);
    const signature = this.joinSplitProver.sign4Notes([...inputNotes, ...outputNotes], sender.privateKey!);

    const tx = new JoinSplitTx(
      sender.publicKey,
      deposit,
      widthraw,
      numInputNotes,
      inputNoteIndices,
      this.worldState.getRoot(),
      inputNotePaths,
      inputNotes,
      outputNotes,
      signature,
    );

    debug(tx);

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.joinSplitProver.createJoinSplitProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);
    debug(proofData);

    const proof: Proof = { proofData, encViewingKey1, encViewingKey2 };
    return proof;
  }
}
