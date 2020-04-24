import createDebug from 'debug';
import { JoinSplitProver, JoinSplitTx } from 'barretenberg-es/client_proofs/join_split_proof';
import { Note } from 'barretenberg-es/client_proofs/note';
import { WorldState } from 'barretenberg-es/world_state';
import { UserState, User } from './user_state';
import { randomBytes } from 'crypto';

const debug = createDebug('bb:join_split_proof');

export class JoinSplitProofCreator {
  constructor(private joinSplitProver: JoinSplitProver, private userState: UserState, private worldState: WorldState) {}

  public async createProof(inputValue: number, outputValue: number, sender: User) {
    const receiver = sender;
    // prettier-ignore
    const senderViewingKey = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11,
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11]);
    const receiverViewingKey = senderViewingKey;

    const notes = this.userState.pickNotes(inputValue);
    const numInputNotes = notes.length;

    while (notes.length < 2) {
      notes.push({ index: notes.length, nullifier: new Buffer([]), note: new Note(sender.publicKey, randomBytes(32), 0) });
    }

    const totalInputValue = notes.reduce((sum, note) => sum + note.note.value, 0);
    const inputNoteIndices = notes.map(n => n.index);
    const inputNotes = notes.map(n => n.note);
    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.worldState.getHashPath(idx)));

    const remainder = totalInputValue - inputValue;
    const outputNotes = [
      new Note(receiver.publicKey, receiverViewingKey, outputValue),
      new Note(sender.publicKey, remainder ? senderViewingKey : randomBytes(32), remainder)
    ];

    const publicInput = Math.max(0, outputValue - inputValue);
    const publicOutput = Math.max(0, inputValue - outputValue);

    const signature = this.joinSplitProver.sign4Notes([...inputNotes, ...outputNotes], sender.privateKey);

    const tx = new JoinSplitTx(
      sender.publicKey,
      publicInput,
      publicOutput,
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
    const proof = await this.joinSplitProver.createJoinSplitProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);
    debug(proof);

    return proof;
  }
}
