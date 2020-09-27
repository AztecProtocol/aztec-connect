import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { JoinSplitTx, computeSigningData } from 'barretenberg/client_proofs/join_split_proof';
import { createNoteSecret, encryptNote, Note } from 'barretenberg/client_proofs/note';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { WorldState } from 'barretenberg/world_state';
import { Signer } from '../../signer';
import { UserState } from '../../user_state';

export class JoinSplitTxFactory {
  constructor(
    private worldState: WorldState,
    private grumpkin: Grumpkin,
    private pedersen: Pedersen,
    private noteAlgos: NoteAlgorithms,
  ) {}

  public async createJoinSplitTx(
    userState: UserState,
    publicInput: bigint,
    publicOutput: bigint,
    assetId: number,
    newNoteValue: bigint,
    signer: Signer,
    senderPubKey: GrumpkinAddress,
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
    const inputNotes = notes.map(n => new Note(senderPubKey, n.viewingKey, n.value, assetId));
    for (let i = notes.length; i < 2; ++i) {
      inputNoteIndices.push(i);
      inputNotes.push(new Note(senderPubKey, createNoteSecret(), BigInt(0), assetId));
    }
    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.worldState.getHashPath(idx)));

    const changeValue = max(BigInt(0), totalNoteInputValue - newNoteValue - publicOutput);
    const newNoteOwner = receiverPubKey || GrumpkinAddress.randomAddress();
    const outputNotes = [
      new Note(newNoteOwner, createNoteSecret(), newNoteValue, assetId),
      new Note(senderPubKey, createNoteSecret(), changeValue, assetId),
    ];

    const dataRoot = this.worldState.getRoot();

    const inputOwner = inputOwnerAddress || EthAddress.ZERO;
    const outputOwner = outputOwnerAddress || EthAddress.ZERO;

    const message = computeSigningData([...inputNotes, ...outputNotes], outputOwner, this.pedersen, this.noteAlgos);
    const signature = await signer.signMessage(message);

    // For now, we will use the account key as the signing key (no account note required).
    const accountIndex = 0;
    const accountPath = await this.worldState.getHashPath(0);
    const signingPubKey = senderPubKey;

    const tx = new JoinSplitTx(
      publicInput,
      publicOutput,
      assetId,
      numInputNotes,
      inputNoteIndices,
      dataRoot,
      inputNotePaths,
      inputNotes,
      outputNotes,
      signature,
      inputOwner,
      outputOwner,
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
