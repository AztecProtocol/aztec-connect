import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { JoinSplitTx, computeSigningData } from 'barretenberg/client_proofs/join_split_proof';
import { createNoteSecret, encryptNote, Note } from 'barretenberg/client_proofs/note';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { WorldState } from 'barretenberg/world_state';
import { Signer } from '../../signer';
import { AccountId, AccountAliasId } from '../../user';
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
    privateInput: bigint,
    privateOutput: bigint,
    assetId: number,
    signer: Signer,
    receiver?: AccountId,
    inputOwnerAddress?: EthAddress,
    outputOwnerAddress?: EthAddress,
  ) {
    const max = (a: bigint, b: bigint) => (a > b ? a : b);
    // const requiredInputNoteValue = max(BigInt(0), newNoteValue + publicOutput - publicInput + privateTxFee);
    const notes = privateInput ? await userState.pickNotes(assetId, privateInput) : [];
    if (!notes) {
      throw new Error(`Failed to find no more than 2 notes that sum to ${privateInput}.`);
    }

    const sender = userState.getUser();
    const accountAliasId = new AccountAliasId(sender.aliasHash || AliasHash.random(), sender.nonce);

    const numInputNotes = notes.length;
    const totalNoteInputValue = notes.reduce((sum, note) => sum + note.value, BigInt(0));
    const inputNoteIndices = notes.map(n => n.index);
    const inputNotes = notes.map(n => new Note(n.owner.publicKey, n.viewingKey, n.value, assetId, n.owner.nonce));
    for (let i = notes.length; i < 2; ++i) {
      inputNoteIndices.push(i);
      inputNotes.push(new Note(sender.publicKey, createNoteSecret(), BigInt(0), assetId, sender.nonce));
    }
    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.worldState.getHashPath(idx)));

    const changeValue = max(BigInt(0), totalNoteInputValue - privateInput);
    const newNoteOwner = receiver || {
      publicKey: GrumpkinAddress.randomAddress(),
      nonce: 0,
    };
    const outputNotes = [
      new Note(newNoteOwner.publicKey, createNoteSecret(), privateOutput, assetId, newNoteOwner.nonce),
      new Note(sender.publicKey, createNoteSecret(), changeValue, assetId, sender.nonce),
    ];

    const dataRoot = this.worldState.getRoot();

    const inputOwner = inputOwnerAddress || EthAddress.ZERO;
    const outputOwner = outputOwnerAddress || EthAddress.ZERO;

    // For now, we will use the account key as the signing key (no account note required).
    const { privateKey } = userState.getUser();

    const message = computeSigningData(
      [...inputNotes, ...outputNotes],
      inputNoteIndices[0],
      inputNoteIndices[1],
      inputOwner,
      outputOwner,
      publicInput,
      publicOutput,
      assetId,
      numInputNotes,
      privateKey,
      this.pedersen,
      this.noteAlgos,
    );

    const signature = await signer.signMessage(message);

    const accountIndex = 0;
    const accountPath = await this.worldState.getHashPath(0);
    const signingPubKey = signer.getPublicKey();

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
      privateKey,
      accountAliasId,
      accountIndex,
      accountPath,
      signingPubKey,
      signature,
      inputOwner,
      outputOwner,
    );

    return tx;
  }

  public createViewingKeys(notes: Note[]) {
    const encViewingKey1 = encryptNote(notes[0], this.grumpkin);
    const encViewingKey2 = encryptNote(notes[1], this.grumpkin);
    return [encViewingKey1, encViewingKey2];
  }
}
