import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { EscapeHatchProver, EscapeHatchTx } from 'barretenberg/client_proofs/escape_hatch_proof';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { WorldState } from 'barretenberg/world_state';
import { toBufferBE } from 'bigint-buffer';
import createDebug from 'debug';
import { utils } from 'ethers';
import { HashPathSource } from 'sriracha/hash_path_source';
import { AccountId } from '../../user';
import { EthereumSigner, Signer } from '../../signer';
import { UserState } from '../../user_state';
import { JoinSplitTxFactory } from '../join_split_proof_creator/join_split_tx_factory';
import { Database } from '../../database';

const debug = createDebug('bb:escape_hatch_proof_creator');

export class EscapeHatchProofCreator {
  private joinSplitTxFactory: JoinSplitTxFactory;

  constructor(
    private escapeHatchProver: EscapeHatchProver,
    // TODO: Make WorldState and HashPathSource unify into a WorldStateSource.
    worldState: WorldState,
    grumpkin: Grumpkin,
    pedersen: Pedersen,
    private noteAlgos: NoteAlgorithms,
    private hashPathSource: HashPathSource,
    db: Database,
  ) {
    this.joinSplitTxFactory = new JoinSplitTxFactory(worldState, grumpkin, pedersen, noteAlgos, db);
  }

  public async createProof(
    userState: UserState,
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    assetId: AssetId,
    signer: Signer,
    receiver?: AccountId,
    outputOwnerAddress?: EthAddress,
    ethSigner?: EthereumSigner,
  ) {
    const { tx: joinSplitTx, outputKeys } = await this.joinSplitTxFactory.createJoinSplitTx(
      userState,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      assetId,
      signer,
      receiver,
      ethSigner ? ethSigner.getAddress() : undefined,
      outputOwnerAddress,
    );
    const viewingKeys = this.joinSplitTxFactory.createViewingKeys(joinSplitTx.outputNotes, outputKeys);

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
    const { privateKey } = userState.getUser();
    const nullifier1 = this.noteAlgos.computeNoteNullifierBigInt(
      encryptedInput1,
      joinSplitTx.inputNoteIndices[0],
      privateKey,
      joinSplitTx.numInputNotes > 0,
    );
    const nullifier2 = this.noteAlgos.computeNoteNullifierBigInt(
      encryptedInput2,
      joinSplitTx.inputNoteIndices[1],
      privateKey,
      joinSplitTx.numInputNotes > 1,
    );
    const nullifierValue = toBufferBE(BigInt(1), 64);
    const nullResponse = await this.hashPathSource.getHashPaths(1, [
      { index: nullifier1, value: nullifierValue },
      { index: nullifier2, value: nullifierValue },
    ]);

    const rootResponse = await this.hashPathSource.getHashPaths(2, [{ index: rootTreeState.size, value: newDataRoot }]);

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
    const txId = rollupProofData.innerProofData[0].txId;

    const depositSignature = publicInput
      ? await this.ethSign(rollupProofData.innerProofData[0].getDepositSigningData(), ethSigner)
      : undefined;

    return { proofData, viewingKeys, depositSignature, txId };
  }

  private async ethSign(txPublicInputs: Buffer, ethSigner?: EthereumSigner) {
    if (!ethSigner) {
      throw new Error('Signer undefined.');
    }

    const msgHash = utils.keccak256(txPublicInputs);
    const digest = utils.arrayify(msgHash);
    let signature = await ethSigner.signMessage(Buffer.from(digest));

    // Ganache is not signature standard compliant. Returns 00 or 01 as v.
    // Need to adjust to make v 27 or 28.
    const v = signature[signature.length - 1];
    if (v <= 1) {
      signature = Buffer.concat([signature.slice(0, -1), Buffer.from([v + 27])]);
    }

    return signature;
  }
}
