import { EthAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { JoinSplitProver } from 'barretenberg/client_proofs/join_split_proof';
import { NoteAlgorithms } from 'barretenberg/client_proofs/note_algorithms';
import { JoinSplitProofData, ProofData } from 'barretenberg/client_proofs/proof_data';
import { Pedersen } from 'barretenberg/crypto/pedersen';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { WorldState } from 'barretenberg/world_state';
import createDebug from 'debug';
import { ethers } from 'ethers';
import { AccountId } from '../../user';
import { Signer } from '../../signer';
import { UserState } from '../../user_state';
import { JoinSplitTxFactory } from './join_split_tx_factory';
import { Database } from '../../database';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { EthereumSigner } from 'barretenberg/blockchain';

const debug = createDebug('bb:join_split_proof_creator');

export class JoinSplitProofCreator {
  private txFactory: JoinSplitTxFactory;

  constructor(
    private joinSplitProver: JoinSplitProver,
    private ethSigner: EthereumSigner,
    worldState: WorldState,
    blake2s: Blake2s,
    grumpkin: Grumpkin,
    pedersen: Pedersen,
    noteAlgos: NoteAlgorithms,
    db: Database,
  ) {
    this.txFactory = new JoinSplitTxFactory(worldState, blake2s, grumpkin, pedersen, noteAlgos, db);
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
    outputOwner?: EthAddress,
    inputOwner?: EthAddress,
  ) {
    if (publicInput && !inputOwner) {
      throw new Error('Input owner undefined.');
    }

    const { tx, viewingKeys } = await this.txFactory.createJoinSplitTx(
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

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.joinSplitProver.createProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    const joinSplitProof = new JoinSplitProofData(new ProofData(proofData));
    const {
      depositSigningData,
      proofData: { txId },
    } = joinSplitProof;

    const depositSignature = publicInput ? await this.ethSign(depositSigningData, inputOwner!) : undefined;

    return { proofData, viewingKeys, depositSignature, txId };
  }

  private async ethSign(txPublicInputs: Buffer, inputOwner: EthAddress) {
    const msgHash = ethers.utils.keccak256(txPublicInputs);
    const digest = ethers.utils.arrayify(msgHash);
    return await this.ethSigner.signMessage(Buffer.from(digest), inputOwner);
  }
}
