import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { EscapeHatchProver, EscapeHatchTx } from 'barretenberg/client_proofs/escape_hatch_proof';
import {
  computeNullifier,
  JoinSplitProof,
  JoinSplitProver,
  JoinSplitTx,
} from 'barretenberg/client_proofs/join_split_proof';
import { createNoteSecret, encryptNote, Note } from 'barretenberg/client_proofs/note';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { WorldState } from 'barretenberg/world_state';
import createDebug from 'debug';
import { ethers, Signer } from 'ethers';
import { UserData } from '../../user';
import { UserState } from '../../user_state';
import { JoinSplitTxFactory } from '../join_split_proof_creator/join_split_tx_factory';
import { HashPathSource } from 'sriracha/hash_path_source';
import { join } from 'path';
import { Blake2s } from 'barretenberg/crypto/blake2s';

const debug = createDebug('bb:join_split_proof');

export class EscapeHatchProofCreator {
  private joinSplitTxFactory: JoinSplitTxFactory;

  constructor(
    private escapeHatchProver: EscapeHatchProver,
    private worldState: WorldState,
    private grumpkin: Grumpkin,
    private blake2s: Blake2s,
    private noteAlgos: NoteAlgorithms,
    private hashPathSource: HashPathSource,
  ) {
    this.joinSplitTxFactory = new JoinSplitTxFactory(worldState, grumpkin, noteAlgos);
  }

  public async createProof(
    userState: UserState,
    // publicInput: bigint,
    publicOutput: bigint,
    newNoteValue: bigint,
    sender: UserData,
    receiverPubKey?: GrumpkinAddress,
    outputOwnerAddress?: EthAddress,
    signer?: Signer,
  ) {
    const joinSplitTx = await this.joinSplitTxFactory.createJoinSplitTx(
      userState,
      BigInt(0), // publicInput,
      publicOutput,
      newNoteValue,
      sender,
      receiverPubKey,
      signer ? EthAddress.fromString(await signer.getAddress()) : undefined,
      outputOwnerAddress,
    );
    const viewingKeys = this.joinSplitTxFactory.createViewingKeys(joinSplitTx.outputNotes);

    // Need to know... sriracha should become a WorldStateSource? Feed in as param for now?
    // I think this is basically the size of the rootRoot tree -1.
    const rollupId = 0;
    const dataStartIndex = this.worldState.getSize();
    const oldDataPath = await this.worldState.getHashPath(dataStartIndex);
    const [input1, input2] = joinSplitTx.inputNotes;
    const encryptedInput1 = this.noteAlgos.encryptNote(input1);
    const encryptedInput2 = this.noteAlgos.encryptNote(input2);
    const nullifier1 = computeNullifier(encryptedInput1, dataStartIndex, input1.secret, this.blake2s);
    const nullifier2 = computeNullifier(encryptedInput2, dataStartIndex, input2.secret, this.blake2s);
    const response = await this.hashPathSource.getHashPaths(1, [nullifier1, nullifier2]);
    const tx = new EscapeHatchTx(joinSplitTx);

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.escapeHatchProver.createProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    // Should be possible to support deposits by slicing the j/s part of proof data below to perform correct signing.
    // const joinSplitProof = new JoinSplitProof(proofData, viewingKeys);
    // const depositSignature = publicInput
    //   ? await this.ethSign(joinSplitProof.getDepositSigningData(), signer)
    //   : undefined;

    return { proofData, viewingKeys };
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
