import createDebug from 'debug';
import { JoinSplitProver, JoinSplitTx } from 'barretenberg-es/client_proofs/join_split_proof';
import { Note } from 'barretenberg-es/client_proofs/note';
import { WorldState } from 'barretenberg-es/world_state';
import { UserState, User } from './user_state';
import { randomBytes } from 'crypto';
import { computeViewingKey } from './utils/computeViewingKey';

const debug = createDebug('bb:join_split_proof');

export class JoinSplitProofCreator {
  constructor(private joinSplitProver: JoinSplitProver, private userState: UserState, private worldState: WorldState) {}

  public async createProof(deposit: number, widthraw: number, transfer: number, sender: User, receiverPubKey: Buffer) {
    const requiredInputNoteValue = Math.max(0, transfer + widthraw - deposit);
    const notes = this.userState.pickNotes(requiredInputNoteValue);
    if (!notes) {
      throw new Error(`Failed to find no more than 2 notes that sum to ${requiredInputNoteValue}.`);
    }
    const numInputNotes = notes.length;

    while (notes.length < 2) {
      notes.push({ index: notes.length, nullifier: new Buffer([]), note: new Note(sender.publicKey, randomBytes(32), 0) });
    }

    const totalNoteInputValue = notes.reduce((sum, note) => sum + note.note.value, 0);
    const inputNoteIndices = notes.map(n => n.index);
    const inputNotes = notes.map(n => n.note);
    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.worldState.getHashPath(idx)));

    const sendValue = transfer + deposit;
    const changeValue = totalNoteInputValue - transfer - widthraw;
    const receiverViewingKey = sendValue ? computeViewingKey(sendValue, receiverPubKey) : randomBytes(32);
    const senderViewingKey = changeValue ? computeViewingKey(changeValue, sender.publicKey) : randomBytes(32);
    const outputNotes = [
      new Note(receiverPubKey, receiverViewingKey, sendValue),
      new Note(sender.publicKey, senderViewingKey, changeValue),
    ];

    const signature = this.joinSplitProver.sign4Notes([...inputNotes, ...outputNotes], sender.privateKey);

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
    // REMOVE ME
    const receiver = this.userState.getUsers().find((u) => u.publicKey.equals(receiverPubKey));
    const proofData = Buffer.from([
      receiver ? 1 : 0,
      outputNotes[0].value,
      receiver ? receiver.id : 0,
      changeValue > 0 ? 1 : 0,
      outputNotes[1].value,
      sender.id,
      ...notes[0].nullifier,
      ...notes[1].nullifier,
    ]);
    // const proofData = await this.joinSplitProver.createJoinSplitProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);
    debug(proofData);

    return {
      proofData,
      encryptedViewingKey1: receiverViewingKey,
      encryptedViewingKey2: senderViewingKey,
    };
  }
}
