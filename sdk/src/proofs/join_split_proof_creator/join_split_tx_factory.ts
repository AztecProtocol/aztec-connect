import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import {
  NoteAlgorithms,
  createEphemeralPrivKey,
  TreeNote,
  computeSigningData,
  JoinSplitTx,
} from '@aztec/barretenberg/client_proofs';
import { Pedersen } from '@aztec/barretenberg/crypto/pedersen';
import { Grumpkin } from '@aztec/barretenberg/ecc/grumpkin';
import { WorldState } from '@aztec/barretenberg/world_state';
import { Database } from '../../database';
import { Signer } from '../../signer';
import { AccountAliasId, AccountId } from '../../user';
import { UserState } from '../../user_state';
import { ClaimNoteTxData } from '@aztec/barretenberg/client_proofs/join_split_proof/claim_note_tx_data';

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
    const inputNotes = notes.map(n => new TreeNote(n.owner.publicKey, n.value, n.assetId, n.owner.nonce, n.secret));
    const maxNoteIndex = Math.max(...inputNoteIndices, 0);
    for (let i = notes.length; i < 2; ++i) {
      inputNoteIndices.push(maxNoteIndex + i); // notes can't have the same index
      inputNotes.push(
        TreeNote.createFromEphPriv(
          publicKey,
          BigInt(0),
          assetId,
          nonce,
          createEphemeralPrivKey(this.grumpkin),
          this.grumpkin,
        ),
      );
    }
    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.worldState.getHashPath(idx)));

    const changeValue = max(BigInt(0), totalNoteInputValue - privateInput);
    const newNoteOwner = receiver || id;

    const outputNote1EphKey = createEphemeralPrivKey(this.grumpkin);
    const outputNote2EphKey = createEphemeralPrivKey(this.grumpkin);
    const outputNotes = [
      TreeNote.createFromEphPriv(
        newNoteOwner.publicKey,
        recipientPrivateOutput,
        assetId,
        newNoteOwner.nonce,
        outputNote1EphKey,
        this.grumpkin,
      ),
      TreeNote.createFromEphPriv(
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
      ClaimNoteTxData.EMPTY,
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
    const viewingKeys = tx.outputNotes.map((n, i) => n.getViewingKey(ephemeralPrivateKeys[i], this.grumpkin));
    return { tx, viewingKeys };
  }
}
