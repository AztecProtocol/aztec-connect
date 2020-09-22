import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { JoinSplitProof, JoinSplitProver } from 'barretenberg/client_proofs/join_split_proof';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { WorldState } from 'barretenberg/world_state';
import createDebug from 'debug';
import { ethers, Signer } from 'ethers';
import { UserData } from '../../user';
import { UserState } from '../../user_state';
import { JoinSplitTxFactory } from './join_split_tx_factory';

const debug = createDebug('bb:join_split_proof_creator');

export class JoinSplitProofCreator {
  private txFactory: JoinSplitTxFactory;

  constructor(
    private joinSplitProver: JoinSplitProver,
    worldState: WorldState,
    grumpkin: Grumpkin,
    noteAlgos: NoteAlgorithms,
  ) {
    this.txFactory = new JoinSplitTxFactory(worldState, grumpkin, noteAlgos);
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
    const tx = await this.txFactory.createJoinSplitTx(
      userState,
      publicInput,
      publicOutput,
      newNoteValue,
      sender,
      receiverPubKey,
      signer ? EthAddress.fromString(await signer.getAddress()) : undefined,
      outputOwnerAddress,
    );
    const viewingKeys = this.txFactory.createViewingKeys(tx.outputNotes);

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.joinSplitProver.createProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    const joinSplitProof = new JoinSplitProof(proofData, viewingKeys);
    const txId = joinSplitProof.getTxId();

    const depositSignature = publicInput
      ? await this.ethSign(joinSplitProof.getDepositSigningData(), signer)
      : undefined;

    return { proofData, viewingKeys, depositSignature, txId };
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
