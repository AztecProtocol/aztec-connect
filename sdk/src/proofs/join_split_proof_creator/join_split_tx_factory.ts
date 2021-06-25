import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { computeSigningData, JoinSplitTx } from '@aztec/barretenberg/client_proofs';
import { Pedersen } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { ClaimNoteTxData, NoteAlgorithms, TreeNote } from '@aztec/barretenberg/note_algorithms';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { WorldState } from '@aztec/barretenberg/world_state';
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
    defiDepositValue: bigint,
    assetId: AssetId,
    signer: Signer,
    newNoteOwner?: AccountId,
    inputOwnerAddress?: EthAddress,
    outputOwnerAddress?: EthAddress,
    bridgeId?: BridgeId,
  ) {
    const isDefiBridge = defiDepositValue > BigInt(0);

    const { id, aliasHash, publicKey, nonce } = userState.getUser();
    const accountIndex = nonce !== 0 ? await this.db.getUserSigningKeyIndex(id, signer.getPublicKey()) : 0;
    if (accountIndex === undefined) {
      throw new Error('Unknown signing key.');
    }

    const accountAliasId = aliasHash ? new AccountAliasId(aliasHash, nonce) : AccountAliasId.random();
    const accountPath = await this.worldState.getHashPath(accountIndex);
    const signingPubKey = signer.getPublicKey();

    const notes = privateInput ? await userState.pickNotes(assetId, privateInput) : [];
    if (!notes) {
      throw new Error(`Failed to find no more than 2 notes that sum to ${privateInput}.`);
    }

    const numInputNotes = notes.length;
    const totalNoteInputValue = notes.reduce((sum, note) => sum + note.value, BigInt(0));
    const inputNoteIndices = notes.map(n => n.index);
    const inputNotes = notes.map(n => new TreeNote(n.owner.publicKey, n.value, n.assetId, n.owner.nonce, n.secret));
    const maxNoteIndex = Math.max(...inputNoteIndices, 0);
    for (let i = notes.length; i < 2; ++i) {
      inputNoteIndices.push(maxNoteIndex + i); // notes can't have the same index
      inputNotes.push(
        TreeNote.createFromEphPriv(publicKey, BigInt(0), assetId, nonce, this.createEphemeralPrivKey(), this.grumpkin),
      );
    }
    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.worldState.getHashPath(idx)));

    const changeValue = totalNoteInputValue > privateInput ? totalNoteInputValue - privateInput : BigInt(0);
    const outputNotes = [
      this.createNote(assetId, recipientPrivateOutput, newNoteOwner || id),
      this.createNote(assetId, changeValue + senderPrivateOutput, id),
    ];
    const claimNote = isDefiBridge
      ? this.createClaimNote(bridgeId!, defiDepositValue, id)
      : {
          note: ClaimNoteTxData.EMPTY,
          viewingKey: ViewingKey.EMPTY,
        };

    const dataRoot = this.worldState.getRoot();

    const inputOwner = inputOwnerAddress || EthAddress.ZERO;
    const outputOwner = outputOwnerAddress || EthAddress.ZERO;

    // For now, we will use the account key as the signing key (no account note required).
    const { privateKey } = userState.getUser();
    const message = computeSigningData(
      [...inputNotes, ...outputNotes.map(n => n.note)],
      claimNote.note,
      inputNoteIndices[0],
      inputNoteIndices[1],
      inputOwner,
      outputOwner,
      publicInput,
      publicOutput,
      assetId,
      numInputNotes,
      id,
      privateKey,
      this.pedersen,
      this.noteAlgos,
    );
    const signature = await signer.signMessage(message);

    const tx = new JoinSplitTx(
      publicInput,
      publicOutput,
      assetId,
      numInputNotes,
      inputNoteIndices,
      dataRoot,
      inputNotePaths,
      inputNotes,
      outputNotes.map(n => n.note),
      claimNote.note,
      privateKey,
      accountAliasId,
      accountIndex,
      accountPath,
      signingPubKey,
      signature,
      inputOwner,
      outputOwner,
    );

    const viewingKeys = [isDefiBridge ? claimNote.viewingKey : outputNotes[0].viewingKey, outputNotes[1].viewingKey];

    return { tx, viewingKeys };
  }

  private createNote(assetId: AssetId, value: bigint, owner: AccountId) {
    const ephKey = this.createEphemeralPrivKey();
    const note = TreeNote.createFromEphPriv(owner.publicKey, value, assetId, owner.nonce, ephKey, this.grumpkin);
    const viewingKey = note.getViewingKey(ephKey, this.grumpkin);
    return { note, viewingKey };
  }

  private createClaimNote(bridgeId: BridgeId, value: bigint, owner: AccountId) {
    const ephKey = this.createEphemeralPrivKey();
    const note = ClaimNoteTxData.createFromEphPriv(value, bridgeId, owner, ephKey, this.grumpkin);
    const viewingKey = note.getViewingKey(owner.publicKey, ephKey, this.grumpkin);
    return { note, viewingKey };
  }

  private createEphemeralPrivKey() {
    return this.grumpkin.getRandomFr();
  }
}
