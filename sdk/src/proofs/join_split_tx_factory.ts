import { AccountAliasId, AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { JoinSplitTx, ProofId } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { ClaimNoteTxData, deriveNoteSecret, NoteAlgorithms, TreeNote } from '@aztec/barretenberg/note_algorithms';
import { WorldState } from '@aztec/barretenberg/world_state';
import { randomBytes } from 'crypto';
import { Database } from '../database';
import { Note } from '../note';
import { UserData } from '../user';

export class JoinSplitTxFactory {
  constructor(
    private noteAlgos: NoteAlgorithms,
    private worldState: WorldState,
    private grumpkin: Grumpkin,
    private db: Database,
  ) {}

  async createTx(
    user: UserData,
    proofId: ProofId,
    assetId: number,
    inputNotes: Note[],
    signingPubKey: GrumpkinAddress,
    {
      publicValue = BigInt(0),
      publicOwner = EthAddress.ZERO,
      outputNoteValue1 = BigInt(0),
      outputNoteValue2 = BigInt(0),
      newNoteOwner = user.id,
      bridgeId = BridgeId.ZERO,
      defiDepositValue = BigInt(0),
      allowChain = 0,
    } = {},
  ) {
    const { id: accountId, aliasHash, privateKey, publicKey, nonce } = user;
    const accountIndex = nonce !== 0 ? await this.db.getUserSigningKeyIndex(accountId, signingPubKey) : 0;
    if (accountIndex === undefined) {
      throw new Error('Unknown signing key.');
    }

    const accountAliasId = aliasHash ? new AccountAliasId(aliasHash, nonce) : AccountAliasId.random();
    const accountPath = await this.worldState.getHashPath(accountIndex);

    const numInputNotes = inputNotes.length;
    const notes = [...inputNotes];
    const inputTreeNotes = notes.map(
      n =>
        new TreeNote(n.owner.publicKey, n.value, n.assetId, n.owner.nonce, n.secret, n.creatorPubKey, n.inputNullifier),
    );

    // Add gibberish notes to ensure we have two notes.
    for (let i = notes.length; i < 2; ++i) {
      const treeNote = TreeNote.createFromEphPriv(
        publicKey, // owner
        BigInt(0), // value
        assetId,
        nonce,
        // TODO: Check with Ariel: is this secure? Or could we accidentally cause nullifier/commitment collisions in future if this is random? The nullifier of this gibberish note will be injected into the output note of this tx.
        randomBytes(32), // inputNullifier - this is a dummy input nullifier for the dummy note.
        this.createEphemeralPrivKey(),
        this.grumpkin,
      );
      inputTreeNotes.push(treeNote);
      notes.push(this.treeNoteToNote(treeNote, user.privateKey, { isRealNote: false }));
    }

    const inputNoteIndices = notes.map(n => n.index);
    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.worldState.getHashPath(idx)));
    const inputNoteNullifiers = notes.map(n => n.nullifier);

    const newNotes = [
      this.createNote(assetId, outputNoteValue1, newNoteOwner, inputNoteNullifiers[0]),
      this.createNote(assetId, outputNoteValue2, accountId, inputNoteNullifiers[1]),
    ];
    const outputNotes = newNotes.map(n => n.note);

    const claimNote =
      proofId === ProofId.DEFI_DEPOSIT
        ? this.createClaimNote(bridgeId, defiDepositValue, user.id, inputNoteNullifiers[0])
        : { note: ClaimNoteTxData.EMPTY, ephPubKey: undefined };

    const propagatedInputIndex = 1 + inputNotes.findIndex(n => n.allowChain);
    const backwardLink = propagatedInputIndex ? inputNotes[propagatedInputIndex - 1].commitment : Buffer.alloc(32);

    const dataRoot = this.worldState.getRoot();

    // For now, we will use the account key as the signing key (no account note required).
    const tx = new JoinSplitTx(
      proofId,
      publicValue,
      publicOwner,
      assetId,
      numInputNotes,
      inputNoteIndices,
      dataRoot,
      inputNotePaths,
      inputTreeNotes,
      outputNotes,
      claimNote.note,
      privateKey,
      accountAliasId,
      accountIndex,
      accountPath,
      signingPubKey,
      backwardLink,
      allowChain,
    );

    const viewingKeys =
      proofId === ProofId.DEFI_DEPOSIT ? [newNotes[1].viewingKey] : [newNotes[0].viewingKey, newNotes[1].viewingKey];

    return { tx, outputNotes, viewingKeys, partialStateSecretEphPubKey: claimNote.ephPubKey };
  }

  treeNoteToNote(
    note: TreeNote,
    privateKey: Buffer,
    { index = 0, allowChain = false, isRealNote = true, pending = true } = {},
  ): Note {
    const { ownerPubKey, value, assetId, nonce, noteSecret, inputNullifier, creatorPubKey } = note;
    const commitment = this.noteAlgos.valueNoteCommitment(note);
    const nullifier = this.noteAlgos.valueNoteNullifier(commitment, privateKey, isRealNote);
    return {
      assetId,
      value,
      secret: noteSecret,
      commitment,
      nullifier,
      nullified: false,
      owner: new AccountId(ownerPubKey, nonce),
      creatorPubKey,
      inputNullifier,
      index,
      allowChain,
      pending,
    };
  }

  private createNote(assetId: number, value: bigint, owner: AccountId, inputNullifier: Buffer, sender?: AccountId) {
    const { ephPrivKey } = this.createEphemeralKeyPair();
    const creatorPubKey: Buffer = sender ? sender.publicKey.x() : Buffer.alloc(32);
    const note = TreeNote.createFromEphPriv(
      owner.publicKey,
      value,
      assetId,
      owner.nonce,
      inputNullifier,
      ephPrivKey,
      this.grumpkin,
      TreeNote.LATEST_VERSION,
      creatorPubKey,
    );
    const viewingKey = note.createViewingKey(ephPrivKey, this.grumpkin);
    return { note, viewingKey };
  }

  private createClaimNote(bridgeId: BridgeId, value: bigint, owner: AccountId, inputNullifier: Buffer) {
    const { ephPrivKey, ephPubKey } = this.createEphemeralKeyPair();
    const noteSecret = deriveNoteSecret(owner.publicKey, ephPrivKey, this.grumpkin);
    const note = new ClaimNoteTxData(value, bridgeId, noteSecret, inputNullifier);
    // ephPubKey is returned for the defi deposit use case, where we'd like to avoid creating a viewing key for the
    // partial claim note's partialState, since all we want to transmit is the ephPubKey (which we can do via offchain tx data).
    return { note, ephPubKey };
  }

  private createEphemeralPrivKey() {
    return this.grumpkin.getRandomFr();
  }

  private createEphemeralKeyPair() {
    const ephPrivKey = this.grumpkin.getRandomFr();
    const ephPubKey = new GrumpkinAddress(this.grumpkin.mul(Grumpkin.one, ephPrivKey));
    return { ephPrivKey, ephPubKey };
  }
}
