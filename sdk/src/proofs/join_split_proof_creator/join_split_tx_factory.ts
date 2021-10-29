import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { JoinSplitTx, ProofId } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { ClaimNoteTxData, TreeNote, NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { WorldState } from '@aztec/barretenberg/world_state';
import { randomBytes } from 'crypto';
import { Database } from '../../database';
import { AccountAliasId, AccountId } from '../../user';
import { UserState } from '../../user_state';

export class JoinSplitTxFactory {
  constructor(
    private noteAlgos: NoteAlgorithms,
    private worldState: WorldState,
    private grumpkin: Grumpkin,
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
    signingPubKey: GrumpkinAddress,
    newNoteOwner?: AccountId,
    publicOwner?: EthAddress,
    propagatedInputIndex?: number,
    backwardLink?: Buffer,
    allowChain?: number,
    bridgeId?: BridgeId,
  ) {
    if (publicInput && publicOutput) {
      throw new Error('Public values cannot be both greater than zero.');
    }

    if (publicOutput + recipientPrivateOutput + senderPrivateOutput > publicInput + privateInput) {
      throw new Error('Total output cannot be larger than total input.');
    }

    if (publicInput + publicOutput && !publicOwner) {
      throw new Error('Public owner undefined.');
    }

    if (recipientPrivateOutput && !newNoteOwner) {
      throw new Error('Note recipient undefined.');
    }

    const isDefiBridge = defiDepositValue > BigInt(0);

    const { id: accountId, aliasHash, privateKey, publicKey, nonce } = userState.getUser();
    const accountIndex = nonce !== 0 ? await this.db.getUserSigningKeyIndex(accountId, signingPubKey) : 0;
    if (accountIndex === undefined) {
      throw new Error('Unknown signing key.');
    }

    const accountAliasId = aliasHash ? new AccountAliasId(aliasHash, nonce) : AccountAliasId.random();
    const accountPath = await this.worldState.getHashPath(accountIndex);

    const notes = privateInput ? await userState.pickNotes(assetId, privateInput) : [];
    if (!notes) {
      throw new Error(`Failed to find no more than 2 notes that sum to ${privateInput}.`);
    }

    const numInputNotes = notes.length;
    const totalNoteInputValue = notes.reduce((sum, note) => sum + note.value, BigInt(0));
    const inputNoteIndices = notes.map(n => n.index);
    const inputNotes = notes.map(
      n =>
        new TreeNote(n.owner.publicKey, n.value, n.assetId, n.owner.nonce, n.secret, n.creatorPubKey, n.inputNullifier),
    );
    const maxNoteIndex = Math.max(...inputNoteIndices, 0);
    const isInputNoteReal: boolean[] = notes.map(() => true);

    // Add gibberish notes to ensure we have two notes.
    for (let i = notes.length; i < 2; ++i) {
      inputNoteIndices.push(maxNoteIndex + i); // Notes can't have the same index
      inputNotes.push(
        TreeNote.createFromEphPriv(
          publicKey, // owner
          BigInt(0), // value
          assetId,
          nonce,
          // TODO: Check with Ariel: is this secure? Or could we accidentally cause nullifier/commitment collisions in future if this is random? The nullifier of this gibberish note will be injected into the output note of this tx.
          randomBytes(32), // inputNullifier - this is a dummy input nullifier for the dummy note.
          this.createEphemeralPrivKey(),
          this.grumpkin,
        ),
      );
      isInputNoteReal.push(false);
    }

    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.worldState.getHashPath(idx)));
    const inputNoteCommitments: Buffer[] = inputNotes.map(n => this.noteAlgos.valueNoteCommitment(n));
    const inputNoteNullifiers: Buffer[] = inputNoteCommitments.map((nc, i) => {
      return this.noteAlgos.valueNoteNullifier(nc, privateKey, isInputNoteReal[i]);
    });

    const changeValue = totalNoteInputValue > privateInput ? totalNoteInputValue - privateInput : BigInt(0);
    const outputNotes = [
      this.createNote(assetId, recipientPrivateOutput, newNoteOwner || accountId, inputNoteNullifiers[0]),
      this.createNote(assetId, changeValue + senderPrivateOutput, accountId, inputNoteNullifiers[1]),
    ];
    const claimNote = isDefiBridge
      ? new ClaimNoteTxData(
          defiDepositValue,
          bridgeId!,
          outputNotes[0].note.noteSecret,
          outputNotes[0].note.inputNullifier,
        )
      : ClaimNoteTxData.EMPTY;
    const partialStateSecretEphPubKey = isDefiBridge ? outputNotes[0].ephPubKey : undefined;

    const dataRoot = this.worldState.getRoot();

    const getProofId = () => {
      if (defiDepositValue > 0) {
        return ProofId.DEFI_DEPOSIT;
      }
      if (publicInput > 0) {
        return ProofId.DEPOSIT;
      }
      if (publicOutput > 0) {
        return ProofId.WITHDRAW;
      }
      return ProofId.SEND;
    };

    // For now, we will use the account key as the signing key (no account note required).
    const tx = new JoinSplitTx(
      getProofId(),
      publicInput + publicOutput,
      publicOwner || EthAddress.ZERO,
      assetId,
      numInputNotes,
      inputNoteIndices,
      dataRoot,
      inputNotePaths,
      inputNotes,
      outputNotes.map(n => n.note),
      claimNote,
      privateKey,
      accountAliasId,
      accountIndex,
      accountPath,
      signingPubKey,
      propagatedInputIndex ?? 0,
      backwardLink ?? Buffer.alloc(32),
      allowChain ?? 0,
    );

    const viewingKeys = isDefiBridge
      ? [outputNotes[1].viewingKey]
      : [outputNotes[0].viewingKey, outputNotes[1].viewingKey];

    return { tx, viewingKeys, partialStateSecretEphPubKey };
  }

  private createNote(assetId: AssetId, value: bigint, owner: AccountId, inputNullifier: Buffer, sender?: AccountId) {
    const { ephPrivKey, ephPubKey } = this.createEphemeralKeyPair();
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
    // ephPubKey is returned for the defi deposit use case, where we'd like to avoid creating a viewing key for the
    // partial claim note's partialState, since all we want to transmit is the ephPubKey (which we can do via offchain tx data).
    return { note, viewingKey, ephPubKey };
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
