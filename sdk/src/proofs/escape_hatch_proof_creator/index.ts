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
import { HashPathSource } from 'sriracha/hash_path_source';
import { Database } from '../../database';
import { Signer } from '../../signer';
import { AccountId } from '../../user';
import { UserState } from '../../user_state';
import { JoinSplitTxFactory } from '../join_split_proof_creator/join_split_tx_factory';

const debug = createDebug('bb:escape_hatch_proof_creator');

export class EscapeHatchProofCreator {
  private joinSplitTxFactory: JoinSplitTxFactory;
  private grumpkin!: Grumpkin;

  // TODO: Make WorldState and HashPathSource unify into a WorldStateSource.
  // Currently we use WorldState for fetching js data paths, but need a HashPathSource for the other trees.
  constructor(
    private escapeHatchProver: EscapeHatchProver,
    worldState: WorldState,
    grumpkin: Grumpkin,
    pedersen: Pedersen,
    private noteAlgos: NoteAlgorithms,
    private hashPathSource: HashPathSource,
    db: Database,
  ) {
    this.joinSplitTxFactory = new JoinSplitTxFactory(worldState, grumpkin, pedersen, noteAlgos, db);
    this.grumpkin = grumpkin;
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
    inputOwner?: EthAddress,
    outputOwner?: EthAddress,
  ) {
    if (publicInput && !inputOwner) {
      throw new Error('Input owner undefined.');
    }

    const { tx: joinSplitTx, viewingKeys } = await this.joinSplitTxFactory.createJoinSplitTx(
      userState,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      assetId,
      signer,
      receiver,
      inputOwner,
      outputOwner,
    );

    const dataTreeState = await this.hashPathSource.getTreeState(0);
    const rootTreeState = await this.hashPathSource.getTreeState(2);
    const rollupId = Number(rootTreeState.size) - 1;
    const dataStartIndex = dataTreeState.size;

    const oldDataPath = await this.hashPathSource.getHashPath(0, dataStartIndex);
    const [output1, output2] = joinSplitTx.outputNotes;
    const encryptedOutput1 = this.noteAlgos.encryptNote(output1.toBuffer());
    const encryptedOutput2 = this.noteAlgos.encryptNote(output2.toBuffer());

    const dataResponse = await this.hashPathSource.getHashPaths(0, [
      { index: dataStartIndex, value: encryptedOutput1 },
      { index: dataStartIndex + BigInt(1), value: encryptedOutput2 },
    ]);

    const newDataRoot = dataResponse.newRoots[1];

    const nullTreeState = await this.hashPathSource.getTreeState(1);
    const oldNullifierRoot = nullTreeState.root;
    const [input1, input2] = joinSplitTx.inputNotes;
    const encryptedInput1 = this.noteAlgos.encryptNote(input1.toBuffer());
    const encryptedInput2 = this.noteAlgos.encryptNote(input2.toBuffer());
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
      oldNullifierRoot,
      nullResponse.newRoots,
      nullResponse.oldHashPaths,
      rootResponse.oldRoot,
      rootResponse.newRoots[0],
      rootResponse.oldHashPaths[0],
    );

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.escapeHatchProver.createProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    const rollupProofData = RollupProofData.fromBuffer(proofData);
    const txId = rollupProofData.innerProofData[0].txId;

    const depositSigningData = publicInput ? rollupProofData.innerProofData[0].getDepositSigningData() : undefined;

    return { proofData, viewingKeys, depositSigningData, txId };
  }
}
