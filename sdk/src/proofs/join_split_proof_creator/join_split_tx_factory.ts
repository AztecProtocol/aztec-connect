import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { JoinSplitTx } from 'barretenberg/client_proofs/join_split_proof';
import { createNoteSecret, encryptNote, Note } from 'barretenberg/client_proofs/note';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { WorldState } from 'barretenberg/world_state';
import { UserData } from '../../user';
import { UserState } from '../../user_state';

export class JoinSplitTxFactory {
  constructor(private worldState: WorldState, private grumpkin: Grumpkin, private noteAlgos: NoteAlgorithms) {}

  public async createJoinSplitTx(
    userState: UserState,
    publicInput: bigint,
    publicOutput: bigint,
    newNoteValue: bigint,
    sender: UserData,
    receiverPubKey?: GrumpkinAddress,
    inputOwnerAddress?: EthAddress,
    outputOwnerAddress?: EthAddress,
  ) {
    const max = (a: bigint, b: bigint) => (a > b ? a : b);
    const requiredInputNoteValue = max(BigInt(0), newNoteValue + publicOutput - publicInput);
    const notes = userState.pickNotes(requiredInputNoteValue);
    if (!notes) {
      throw new Error(`Failed to find no more than 2 notes that sum to ${requiredInputNoteValue}.`);
    }
    const numInputNotes = notes.length;

    const totalNoteInputValue = notes.reduce((sum, note) => sum + note.value, BigInt(0));
    const inputNoteIndices = notes.map(n => n.index);
    const inputNotes = notes.map(n => new Note(sender.publicKey, n.viewingKey, n.value));
    for (let i = notes.length; i < 2; ++i) {
      inputNoteIndices.push(i);
      inputNotes.push(new Note(sender.publicKey, createNoteSecret(), BigInt(0)));
    }
    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.worldState.getHashPath(idx)));

    const changeValue = max(BigInt(0), totalNoteInputValue - newNoteValue - publicOutput);
    const newNoteOwner = receiverPubKey || GrumpkinAddress.randomAddress();
    const outputNotes = [
      new Note(newNoteOwner, createNoteSecret(), newNoteValue),
      new Note(sender.publicKey, createNoteSecret(), changeValue),
    ];

    const signature = this.noteAlgos.sign4Notes(
      [...inputNotes, ...outputNotes],
      sender.privateKey!,
      outputOwnerAddress?.toBuffer(),
    );

    const dataRoot = this.worldState.getRoot();

    // For now, we will use the account key as the signing key (no account note required).
    const accountIndex = 0;
    const accountPath = await this.worldState.getHashPath(0);
    const signingPubKey = sender.publicKey;

    const tx = new JoinSplitTx(
      publicInput,
      publicOutput,
      numInputNotes,
      inputNoteIndices,
      dataRoot,
      inputNotePaths,
      inputNotes,
      outputNotes,
      signature,
      inputOwnerAddress || EthAddress.ZERO,
      outputOwnerAddress || EthAddress.ZERO,
      accountIndex,
      accountPath,
      signingPubKey,
    );

    return tx;
  }

  public createViewingKeys(notes: Note[]) {
    const encViewingKey1 = encryptNote(notes[0], this.grumpkin);
    const encViewingKey2 = encryptNote(notes[1], this.grumpkin);
    return [encViewingKey1, encViewingKey2];
  }
}
