import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { computeSigningData, JoinSplitTx } from 'barretenberg/client_proofs/join_split_proof';
import { createEphemeralPrivKey, encryptNote, Note } from 'barretenberg/client_proofs/note';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { WorldState } from 'barretenberg/world_state';
import { Database } from '../../database';
import { Signer } from '../../signer';
import { AccountAliasId, AccountId } from '../../user';
import { UserState } from '../../user_state';

export class JoinSplitTxFactory {
  constructor(
    private worldState: WorldState,
    private grumpkin: Grumpkin,
    private pedersen: Pedersen,
    private noteAlgos: NoteAlgorithms,
    private db: Database,
  ) {}

  public async createJoinSplitTx(
    userState: UserState,
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    assetId: AssetId,
    signer: Signer,
    receiver?: AccountId,
    inputOwnerAddress?: EthAddress,
    outputOwnerAddress?: EthAddress,
  ) {
    const max = (a: bigint, b: bigint) => (a > b ? a : b);
    const notes = privateInput ? await userState.pickNotes(assetId, privateInput) : [];
    if (!notes) {
      throw new Error(`Failed to find no more than 2 notes that sum to ${privateInput}.`);
    }

    const { id, aliasHash, publicKey, nonce } = userState.getUser();
    const accountAliasId = aliasHash ? new AccountAliasId(aliasHash, nonce) : AccountAliasId.random();

    const numInputNotes = notes.length;
    const totalNoteInputValue = notes.reduce((sum, note) => sum + note.value, BigInt(0));
    const inputNoteIndices = notes.map(n => n.index);
    const inputNotes = notes.map(n => new Note(n.owner.publicKey, n.value, n.assetId, n.owner.nonce, n.secret));
    const maxNoteIndex = Math.max(...inputNoteIndices, 0);
    for (let i = notes.length; i < 2; ++i) {
      inputNoteIndices.push(maxNoteIndex + i); // notes can't have the same index
      inputNotes.push(
        Note.createFromEphPriv(publicKey, BigInt(0), assetId, nonce, createEphemeralPrivKey(), this.grumpkin),
      );
    }
    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.worldState.getHashPath(idx)));

    const changeValue = max(BigInt(0), totalNoteInputValue - privateInput);
    const newNoteOwner = receiver || {
      publicKey: GrumpkinAddress.randomAddress(),
      nonce: 0,
    };

    const outputNote1EphKey = createEphemeralPrivKey();
    const outputNote2EphKey = createEphemeralPrivKey();
    const outputNotes = [
      Note.createFromEphPriv(
        newNoteOwner.publicKey,
        recipientPrivateOutput,
        assetId,
        newNoteOwner.nonce,
        outputNote1EphKey,
        this.grumpkin,
      ),
      Note.createFromEphPriv(
        publicKey,
        changeValue + senderPrivateOutput,
        assetId,
        nonce,
        outputNote2EphKey,
        this.grumpkin,
      ),
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

    const accountIndex = nonce !== 0 ? await this.db.getUserSigningKeyIndex(id, signer.getPublicKey()) : 0;
    if (accountIndex === undefined) {
      throw new Error('Unknown signing key.');
    }

    const accountPath = await this.worldState.getHashPath(accountIndex);
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

    const ephemeralPrivateKeys = [outputNote1EphKey, outputNote2EphKey];
    const viewingKeys = this.createViewingKeys(tx.outputNotes, ephemeralPrivateKeys);
    return { tx, viewingKeys };
  }

  private createViewingKeys(notes: Note[], ephemeralPrivateKeys: Buffer[]) {
    const encViewingKey1 = encryptNote(notes[0], ephemeralPrivateKeys[0], this.grumpkin);
    const encViewingKey2 = encryptNote(notes[1], ephemeralPrivateKeys[1], this.grumpkin);
    return [encViewingKey1, encViewingKey2];
  }
}
