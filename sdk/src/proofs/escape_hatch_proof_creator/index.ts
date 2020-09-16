import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { EscapeHatchProver, EscapeHatchTx } from 'barretenberg/client_proofs/escape_hatch_proof';
import { computeNullifier, nullifierBufferToIndex } from 'barretenberg/client_proofs/join_split_proof';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { WorldState } from 'barretenberg/world_state';
import createDebug from 'debug';
import { UserData } from '../../user';
import { UserState } from '../../user_state';
import { JoinSplitTxFactory } from '../join_split_proof_creator/join_split_tx_factory';
import { HashPathSource } from 'sriracha/hash_path_source';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { toBufferBE } from 'bigint-buffer';

const debug = createDebug('bb:join_split_proof');

export class EscapeHatchProofCreator {
  private joinSplitTxFactory: JoinSplitTxFactory;

  constructor(
    private escapeHatchProver: EscapeHatchProver,
    // TODO: Make WorldState and HashPathSource unify into a WorldStateSource.
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
    // signer?: Signer,
  ) {
    const joinSplitTx = await this.joinSplitTxFactory.createJoinSplitTx(
      userState,
      BigInt(0), // publicInput,
      publicOutput,
      newNoteValue,
      sender,
      receiverPubKey,
      undefined, //signer ? EthAddress.fromString(await signer.getAddress()) : undefined,
      outputOwnerAddress,
    );
    const viewingKeys = this.joinSplitTxFactory.createViewingKeys(joinSplitTx.outputNotes);

    const dataTreeState = await this.hashPathSource.getTreeState(0);
    const rootTreeState = await this.hashPathSource.getTreeState(2);
    const rollupId = Number(rootTreeState.size) - 1;
    const dataStartIndex = dataTreeState.size;

    const oldDataPath = await this.hashPathSource.getHashPath(0, dataStartIndex);
    const [input1, input2] = joinSplitTx.inputNotes;
    const encryptedInput1 = this.noteAlgos.encryptNote(input1);
    const encryptedInput2 = this.noteAlgos.encryptNote(input2);
    const dataResponse = await this.hashPathSource.getHashPaths(0, [
      { index: dataStartIndex, value: encryptedInput1 },
      { index: dataStartIndex + BigInt(1), value: encryptedInput2 },
    ]);
    const newDataRoot = dataResponse.newRoots[1];
    const newDataPath = dataResponse.newHashPaths[0];

    const nullTreeState = await this.hashPathSource.getTreeState(1);
    const nullifier1 = nullifierBufferToIndex(
      computeNullifier(encryptedInput1, Number(dataStartIndex), input1.secret, this.blake2s),
    );
    const nullifier2 = nullifierBufferToIndex(
      computeNullifier(encryptedInput2, Number(dataStartIndex) + 1, input2.secret, this.blake2s),
    );
    const nullifierValue = toBufferBE(BigInt(1), 64);
    const nullResponse = await this.hashPathSource.getHashPaths(1, [
      { index: nullifier1, value: nullifierValue },
      { index: nullifier2, value: nullifierValue },
    ]);
    const oldNullifierRoot = nullTreeState.root;

    const rootResponse = await this.hashPathSource.getHashPaths(2, [{ index: rootTreeState.size, value: newDataRoot }]);

    // For now we are always using the main key to sign, so this can be nonsense path.
    const accountNullifierPath = await this.hashPathSource.getHashPath(1, BigInt(0));

    const tx = new EscapeHatchTx(
      joinSplitTx,
      rollupId,
      Number(dataStartIndex),
      newDataRoot,
      oldDataPath,
      newDataPath,
      oldNullifierRoot,
      nullResponse.newRoots,
      nullResponse.oldHashPaths,
      nullResponse.newHashPaths,
      accountNullifierPath,
      rootResponse.oldRoot,
      rootResponse.newRoots[0],
      rootResponse.oldHashPaths[0],
      rootResponse.newHashPaths[0],
    );

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

  /*
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
*/
}
