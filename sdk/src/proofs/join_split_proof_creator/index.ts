import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { JoinSplitProof, JoinSplitProver } from 'barretenberg/client_proofs/join_split_proof';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { WorldState } from 'barretenberg/world_state';
import createDebug from 'debug';
import { ethers } from 'ethers';
import { EthereumSigner, Signer } from '../../signer';
import { UserState } from '../../user_state';
import { JoinSplitTxFactory } from './join_split_tx_factory';

const debug = createDebug('bb:join_split_proof_creator');

export class JoinSplitProofCreator {
  private txFactory: JoinSplitTxFactory;

  constructor(
    private joinSplitProver: JoinSplitProver,
    worldState: WorldState,
    grumpkin: Grumpkin,
    pedersen: Pedersen,
    noteAlgos: NoteAlgorithms,
  ) {
    this.txFactory = new JoinSplitTxFactory(worldState, grumpkin, pedersen, noteAlgos);
  }

  public async createProof(
    userState: UserState,
    publicInput: bigint,
    publicOutput: bigint,
    assetId: number,
    newNoteValue: bigint,
    signer: Signer,
    senderPubKey: GrumpkinAddress,
    receiverPubKey?: GrumpkinAddress,
    outputOwnerAddress?: EthAddress,
    ethSigner?: EthereumSigner,
  ) {
    const tx = await this.txFactory.createJoinSplitTx(
      userState,
      publicInput,
      publicOutput,
      assetId,
      newNoteValue,
      signer,
      senderPubKey,
      receiverPubKey,
      ethSigner ? ethSigner.getAddress() : undefined,
      outputOwnerAddress,
    );
    const viewingKeys = this.txFactory.createViewingKeys(tx.outputNotes);

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.joinSplitProver.createProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    const joinSplitProof = new JoinSplitProof(proofData, viewingKeys);
    const txId = joinSplitProof.txId;

    const depositSignature = publicInput
      ? await this.ethSign(joinSplitProof.getDepositSigningData(), ethSigner)
      : undefined;

    return { proofData, viewingKeys, depositSignature, txId };
  }

  private async ethSign(txPublicInputs: Buffer, ethSigner?: EthereumSigner) {
    if (!ethSigner) {
      throw new Error('Signer undefined.');
    }

    const msgHash = ethers.utils.keccak256(txPublicInputs);
    const digest = ethers.utils.arrayify(msgHash);
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
