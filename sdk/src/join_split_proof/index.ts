import createDebug from 'debug';
import { JoinSplitProver, JoinSplitTx, JoinSplitProof } from 'barretenberg/client_proofs/join_split_proof';
import { Note, encryptNote, createNoteSecret } from 'barretenberg/client_proofs/note';
import { WorldState } from 'barretenberg/world_state';
import { UserState } from '../user_state';
import { randomBytes } from 'crypto';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { ethers } from 'ethers';
import { User } from '../user';
import { Signer } from '../sdk';

const debug = createDebug('bb:join_split_proof');

export class JoinSplitProofCreator {
  constructor(private joinSplitProver: JoinSplitProver, private worldState: WorldState, private grumpkin: Grumpkin) {}

  public async createProof(
    userState: UserState,
    publicInput: number,
    publicOutput: number,
    newNoteValue: number,
    sender: User,
    receiverPubKey?: Buffer,
    outputOwnerAddress?: Buffer,
    signer?: Signer,
  ) {
    const requiredInputNoteValue = Math.max(0, newNoteValue + publicOutput - publicInput);
    const notes = userState.pickNotes(requiredInputNoteValue);
    if (!notes) {
      throw new Error(`Failed to find no more than 2 notes that sum to ${requiredInputNoteValue}.`);
    }
    const numInputNotes = notes.length;

    const totalNoteInputValue = notes.reduce((sum, note) => sum + note.value, 0);
    const inputNoteIndices = notes.map(n => n.index);
    const inputNotes = notes.map(n => new Note(sender.publicKey, n.viewingKey, n.value));
    for (let i = notes.length; i < 2; ++i) {
      inputNoteIndices.push(i);
      inputNotes.push(new Note(sender.publicKey, createNoteSecret(), 0));
    }
    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.worldState.getHashPath(idx)));

    const changeValue = Math.max(0, totalNoteInputValue - newNoteValue - publicOutput);
    const newNoteOwner = receiverPubKey || randomBytes(64);
    const outputNotes = [
      new Note(newNoteOwner, createNoteSecret(), newNoteValue),
      new Note(sender.publicKey, createNoteSecret(), changeValue),
    ];

    const encViewingKey1 = encryptNote(outputNotes[0], this.grumpkin);
    const encViewingKey2 = encryptNote(outputNotes[1], this.grumpkin);
    const signature = this.joinSplitProver.sign4Notes([...inputNotes, ...outputNotes], sender.privateKey!);

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
      signer?.getAddress() || Buffer.alloc(20),
      outputOwnerAddress || Buffer.alloc(20),
      accountIndex,
      accountPath,
      signingPubKey,
    );

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.joinSplitProver.createJoinSplitProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    const viewingKeys = [encViewingKey1, encViewingKey2];
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
    return await signer.signMessage(Buffer.from(msgHash.slice(2), 'hex'));
  }
}
