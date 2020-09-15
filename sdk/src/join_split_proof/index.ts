import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { JoinSplitProof, JoinSplitProver, JoinSplitTx } from 'barretenberg/client_proofs/join_split_proof';
import { createNoteSecret, encryptNote, Note } from 'barretenberg/client_proofs/note';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { WorldState } from 'barretenberg/world_state';
import createDebug from 'debug';
import { ethers, Signer } from 'ethers';
import { UserData } from '../user';
import { UserState } from '../user_state';

const debug = createDebug('bb:join_split_proof');

export class JoinSplitProofCreator {
  constructor(
    private joinSplitProver: JoinSplitProver,
    private worldState: WorldState,
    private grumpkin: Grumpkin,
    private noteAlgos: NoteAlgorithms,
  ) {}

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

    const signature = this.noteAlgos.sign4Notes([...inputNotes, ...outputNotes], sender.privateKey!);

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

  public async createProof(
    userState: UserState,
    publicInput: bigint,
    publicOutput: bigint,
    newNoteValue: bigint,
    sender: UserData,
    receiverPubKey?: GrumpkinAddress,
    outputOwnerAddress?: EthAddress,
    signer?: Signer,
  ) {
    const tx = await this.createJoinSplitTx(
      userState,
      publicInput,
      publicOutput,
      newNoteValue,
      sender,
      receiverPubKey,
      signer ? EthAddress.fromString(await signer.getAddress()) : undefined,
      outputOwnerAddress,
    );
    const viewingKeys = this.createViewingKeys(tx.outputNotes);

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.joinSplitProver.createProof(tx.toBuffer());
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    const joinSplitProof = new JoinSplitProof(proofData, viewingKeys);
    const depositSignature = publicInput
      ? await this.ethSign(joinSplitProof.getDepositSigningData(), signer)
      : undefined;

    return { proofData, viewingKeys, depositSignature };
  }

  private async ethSign(txPublicInputs: Buffer, signer?: Signer) {
    if (!signer) {
      throw new Error('Signer undefined.');
    }

    const msgHash = ethers.utils.keccak256(txPublicInputs);
    const digest = ethers.utils.arrayify(msgHash);
    const sig = await signer.signMessage(digest);
    let signature = Buffer.from(sig.slice(2), 'hex');

    // Ganache is not signature standard compliant. Returns 00 or 01 as v.
    // Need to adjust to make v 27 or 28.
    const v = signature[signature.length - 1];
    if (v <= 1) {
      signature = Buffer.concat([signature.slice(0, -1), Buffer.from([v + 27])]);
    }

    return signature;
  }
}
