import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { Pedersen, randomBytes } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { HashPath, MemoryMerkleTree } from '@aztec/barretenberg/merkle_tree';
import { ClaimNoteTxData, deriveNoteSecret, NoteAlgorithms, TreeNote } from '@aztec/barretenberg/note_algorithms';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { AuthAlgorithms } from '../../auth_algorithms/index.js';
import { Note } from '../../note/index.js';
import { SpendingKeyAccount } from '../proof_request_data/index.js';
import { JoinSplitTxInput } from './join_split_tx_input.js';
import { PaymentProofInput } from './proof_input.js';

export class JoinSplitTxInputCreator {
  constructor(private noteAlgos: NoteAlgorithms, private grumpkin: Grumpkin, private pedersen: Pedersen) {}

  async createTx(
    accountPublicKey: GrumpkinAddress,
    proofId: ProofId,
    assetId: number,
    publicValue: bigint,
    publicOwner: EthAddress,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    bridgeCallData: BridgeCallData,
    defiDepositValue: bigint,
    recipient: GrumpkinAddress,
    recipientSpendingKeyRequired: boolean,
    inputNotes: Note[],
    { spendingPublicKey, aliasHash, accountIndex, accountPath }: SpendingKeyAccount,
    dataRoot: Buffer,
    allowChain: number,
    hideNoteCreator: boolean,
    authAlgos: AuthAlgorithms,
  ) {
    if (inputNotes.length > 2) {
      throw new Error('Cannot create a proof with more than 2 input notes.');
    }

    if (inputNotes.reduce((count, n) => count + (n.allowChain ? 1 : 0), 0) > 1) {
      throw new Error('Cannot chain from more than one pending note.');
    }

    const accountSpendingKeyRequired = !spendingPublicKey.equals(accountPublicKey);
    const notes = [...inputNotes];
    // Add gibberish notes to ensure we have two notes.
    for (let i = notes.length; i < 2; ++i) {
      notes.push(await this.createGibberishNote(accountPublicKey, accountSpendingKeyRequired, assetId, authAlgos));
    }
    const zeroHashPath = HashPath.ZERO(
      WorldStateConstants.DATA_TREE_DEPTH,
      MemoryMerkleTree.ZERO_ELEMENT,
      this.pedersen,
    ).toBuffer();
    const completeInputNotes = notes.map(n =>
      n.hashPath
        ? n
        : new Note(n.treeNote, n.commitment, n.nullifier, n.allowChain, n.nullified, n.index, zeroHashPath),
    );

    const newNotes = [
      await this.createNote(
        assetId,
        recipientPrivateOutput,
        recipient,
        recipientSpendingKeyRequired,
        notes[0].nullifier,
        ProofData.allowChainFromNote1(allowChain),
        hideNoteCreator ? GrumpkinAddress.ZERO : accountPublicKey,
        authAlgos,
      ),
      await this.createNote(
        assetId,
        senderPrivateOutput,
        accountPublicKey,
        accountSpendingKeyRequired,
        notes[1].nullifier,
        ProofData.allowChainFromNote2(allowChain),
        hideNoteCreator ? GrumpkinAddress.ZERO : accountPublicKey,
        authAlgos,
      ),
    ];

    const claimNote =
      proofId === ProofId.DEFI_DEPOSIT
        ? this.createClaimNote(bridgeCallData, defiDepositValue, accountPublicKey, notes[0].nullifier)
        : { note: ClaimNoteTxData.EMPTY, ephPubKey: GrumpkinAddress.ZERO };

    const propagatedInputIndex = 1 + inputNotes.findIndex(n => n.allowChain);
    const backwardLink = propagatedInputIndex ? inputNotes[propagatedInputIndex - 1].commitment : Buffer.alloc(32);

    const tx: JoinSplitTxInput = {
      proofId,
      publicValue,
      publicOwner,
      inputNotes: completeInputNotes,
      outputNotes: newNotes.map(n => n.note),
      claimNote: claimNote.note,
      spendingPublicKey,
      aliasHash,
      accountIndex,
      accountPath,
      dataRoot,
      backwardLink,
      allowChain,
    };

    const viewingKeys =
      proofId === ProofId.DEFI_DEPOSIT ? [newNotes[1].viewingKey] : [newNotes[0].viewingKey, newNotes[1].viewingKey];

    const signingData = await authAlgos.createJoinSplitProofSigningData(tx);

    return {
      tx,
      viewingKeys,
      partialStateSecretEphPubKey: claimNote.ephPubKey,
      signingData,
      outputNotes: newNotes.map(n => n.note),
    };
  }

  /**
   * This method creates a chain of J/S txs to merge 3 or more notes and produces 2 output notes.
   * We do this by splitting the notes into settled and pending (there must be at most 1 pending note!).
   * Then we pair a settled note with a settled/pending note to produce a pending output note.
   * Then we pair that pending output note with another settled note to produce a new pending output note.
   * Repeat this until we have 2 notes remaining, one pending and one settled.
   */
  async createChainedTxs(
    accountPublicKey: GrumpkinAddress,
    assetId: number,
    notes: Note[],
    spendingKeyAccount: SpendingKeyAccount,
    dataRoot: Buffer,
    authAlgos: AuthAlgorithms,
  ) {
    if (notes.length <= 2) {
      throw new Error(`Can only merge 3 or more notes. Got ${notes.length}.`);
    }

    const settledNotes = notes.filter(n => !n.pending);
    let firstNote = notes.find(n => n.pending) || settledNotes.shift()!;
    const lastNote = settledNotes.pop()!;

    // Create chained txs to generate 2 output notes.
    const proofInputs: PaymentProofInput[] = [];
    for (const note of settledNotes) {
      const inputNotes = [firstNote, note];
      const noteSum = inputNotes.reduce((sum, n) => sum + n.value, BigInt(0));
      const { tx, viewingKeys, signingData, outputNotes } = await this.createTx(
        accountPublicKey,
        ProofId.SEND,
        assetId,
        BigInt(0), // publicValue
        EthAddress.ZERO,
        BigInt(0), // recipientPrivateOutput
        noteSum, // senderPrivateOutput
        BridgeCallData.ZERO,
        BigInt(0), // defiDepositValue
        GrumpkinAddress.generator(), // recipient
        false, // recipientSpendingKeyRequired
        inputNotes,
        spendingKeyAccount,
        dataRoot,
        2, // allowChain
        false, // hideNoteCreator
        authAlgos,
      );
      proofInputs.push({ tx, viewingKeys, signingData });
      firstNote = outputNotes[1];
    }

    const outputNotes = [firstNote, lastNote];

    return { proofInputs, outputNotes };
  }

  private async createGibberishNote(
    owner: GrumpkinAddress,
    spendingKeyRequired: boolean,
    assetId: number,
    authAlgos: AuthAlgorithms,
  ) {
    const treeNote = TreeNote.createFromEphPriv(
      owner,
      BigInt(0), // value
      assetId,
      spendingKeyRequired,
      randomBytes(32), // inputNullifier - this is a dummy input nullifier for the dummy note.
      this.createEphemeralPrivKey(),
      this.grumpkin,
    );
    const commitment = this.noteAlgos.valueNoteCommitment(treeNote);
    const nullifier = await authAlgos.computeValueNoteNullifier(commitment, true);
    return new Note(treeNote, commitment, nullifier, false, false);
  }

  private async createNote(
    assetId: number,
    value: bigint,
    owner: GrumpkinAddress,
    spendingKeyRequired: boolean,
    inputNullifier: Buffer,
    allowChain: boolean,
    creator: GrumpkinAddress,
    authAlgos: AuthAlgorithms,
  ) {
    const { ephPrivKey } = this.createEphemeralKeyPair();
    const treeNote = TreeNote.createFromEphPriv(
      owner,
      value,
      assetId,
      spendingKeyRequired,
      inputNullifier,
      ephPrivKey,
      this.grumpkin,
      creator.x(),
    );
    const viewingKey = treeNote.createViewingKey(ephPrivKey, this.grumpkin);
    const commitment = this.noteAlgos.valueNoteCommitment(treeNote);
    const nullifier = await authAlgos.computeValueNoteNullifier(commitment, false);
    const note = new Note(treeNote, commitment, nullifier, allowChain, false);
    return { note, viewingKey };
  }

  private createClaimNote(
    bridgeCallData: BridgeCallData,
    value: bigint,
    owner: GrumpkinAddress,
    inputNullifier: Buffer,
  ) {
    const { ephPrivKey, ephPubKey } = this.createEphemeralKeyPair();
    const noteSecret = deriveNoteSecret(owner, ephPrivKey, this.grumpkin);
    const note = new ClaimNoteTxData(value, bridgeCallData, noteSecret, inputNullifier);
    // ephPubKey is returned for the defi deposit use case, where we'd like to avoid creating a viewing key for the
    // partial claim note's partialState, since all we want to transmit is the ephPubKey (which we can do via offchain tx data).
    return { note, ephPubKey };
  }

  private createEphemeralPrivKey() {
    return this.grumpkin.getRandomFr();
  }

  private createEphemeralKeyPair() {
    const ephPrivKey = this.grumpkin.getRandomFr();
    const ephPubKey = new GrumpkinAddress(this.grumpkin.mul(Grumpkin.generator, ephPrivKey));
    return { ephPrivKey, ephPubKey };
  }
}
