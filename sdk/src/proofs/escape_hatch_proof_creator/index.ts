import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { EscapeHatchProver, EscapeHatchTx } from 'barretenberg/client_proofs/escape_hatch_proof';
import { computeNullifier, nullifierBufferToIndex } from 'barretenberg/client_proofs/join_split_proof';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { WorldState } from 'barretenberg/world_state';
import { toBufferBE } from 'bigint-buffer';
import createDebug from 'debug';
import { utils } from 'ethers';
import { HashPathSource } from 'sriracha/hash_path_source';
import { Signer } from '../../signer';
import { UserData } from '../../user';
import { UserState } from '../../user_state';
import { JoinSplitTxFactory } from '../join_split_proof_creator/join_split_tx_factory';

const debug = createDebug('bb:escape_hatch_proof_creator');

export class EscapeHatchProofCreator {
  private joinSplitTxFactory: JoinSplitTxFactory;

  constructor(
    private escapeHatchProver: EscapeHatchProver,
    // TODO: Make WorldState and HashPathSource unify into a WorldStateSource.
    worldState: WorldState,
    grumpkin: Grumpkin,
    private blake2s: Blake2s,
    private noteAlgos: NoteAlgorithms,
    private hashPathSource: HashPathSource,
  ) {
    this.joinSplitTxFactory = new JoinSplitTxFactory(worldState, grumpkin, noteAlgos);
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
    const joinSplitTx = await this.joinSplitTxFactory.createJoinSplitTx(
      userState,
      publicInput,
      publicOutput,
      newNoteValue,
      sender,
      receiverPubKey,
      signer ? EthAddress.fromString(await signer.getAddress()) : undefined,
      outputOwnerAddress,
    );
    const viewingKeys = this.joinSplitTxFactory.createViewingKeys(joinSplitTx.outputNotes);

    const dataTreeState = await this.hashPathSource.getTreeState(0);
    const rootTreeState = await this.hashPathSource.getTreeState(2);
    const rollupId = Number(rootTreeState.size) - 1;
    const dataStartIndex = dataTreeState.size;

    const oldDataPath = await this.hashPathSource.getHashPath(0, dataStartIndex);
    const [output1, output2] = joinSplitTx.outputNotes;
    const encryptedOutput1 = this.noteAlgos.encryptNote(output1);
    const encryptedOutput2 = this.noteAlgos.encryptNote(output2);

    const dataResponse = await this.hashPathSource.getHashPaths(0, [
      { index: dataStartIndex, value: encryptedOutput1 },
      { index: dataStartIndex + BigInt(1), value: encryptedOutput2 },
    ]);

    const newDataRoot = dataResponse.newRoots[1];
    const newDataPath = dataResponse.newHashPaths[1];

    const nullTreeState = await this.hashPathSource.getTreeState(1);
    const oldNullifierRoot = nullTreeState.root;
    const [input1, input2] = joinSplitTx.inputNotes;
    const encryptedInput1 = this.noteAlgos.encryptNote(input1);
    const encryptedInput2 = this.noteAlgos.encryptNote(input2);
    const nullifier1 = nullifierBufferToIndex(
      computeNullifier(
        encryptedInput1,
        joinSplitTx.inputNoteIndices[0],
        input1.secret,
        this.blake2s,
        joinSplitTx.numInputNotes > 0,
      ),
    );
    const nullifier2 = nullifierBufferToIndex(
      computeNullifier(
        encryptedInput2,
        joinSplitTx.inputNoteIndices[1],
        input2.secret,
        this.blake2s,
        joinSplitTx.numInputNotes > 1,
      ),
    );
    const nullifierValue = toBufferBE(BigInt(1), 64);
    const nullResponse = await this.hashPathSource.getHashPaths(1, [
      { index: nullifier1, value: nullifierValue },
      { index: nullifier2, value: nullifierValue },
    ]);

    const rootResponse = await this.hashPathSource.getHashPaths(2, [{ index: rootTreeState.size, value: newDataRoot }]);

    const accountNote = Buffer.concat([joinSplitTx.inputNotes[0].ownerPubKey.x(), joinSplitTx.signingPubKey.x()]);
    const accountNullifier = nullifierBufferToIndex(this.blake2s.hashToField(accountNote));
    const accountNullifierPath = await this.hashPathSource.getHashPath(1, accountNullifier);

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

    const rollupProofData = RollupProofData.fromBuffer(proofData);
    const txId = rollupProofData.innerProofData[0].getTxId();

    const depositSignature = publicInput
      ? await this.ethSign(rollupProofData.innerProofData[0].getDepositSigningData(), signer)
      : undefined;

    return { proofData, viewingKeys, depositSignature, txId };
  }

  private async ethSign(txPublicInputs: Buffer, signer?: Signer) {
    if (!signer) {
      throw new Error('Signer undefined.');
    }

    const msgHash = utils.keccak256(txPublicInputs);
    const digest = utils.arrayify(msgHash);
    const sig = await signer.signMessage(Buffer.from(digest));
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
