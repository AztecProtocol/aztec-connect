import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { JoinSplitProver } from '@aztec/barretenberg/client_proofs/join_split_proof';
import { NoteAlgorithms } from '@aztec/barretenberg/client_proofs/note_algorithms';
import { JoinSplitProofData, ProofData } from '@aztec/barretenberg/client_proofs/proof_data';
import { Pedersen } from '@aztec/barretenberg/crypto/pedersen';
import { Grumpkin } from '@aztec/barretenberg/ecc/grumpkin';
import { WorldState } from '@aztec/barretenberg/world_state';
import createDebug from 'debug';
import { Database } from '../../database';
import { Signer } from '../../signer';
import { AccountId } from '../../user';
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
    db: Database,
  ) {
    this.txFactory = new JoinSplitTxFactory(worldState, grumpkin, pedersen, noteAlgos, db);
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

    return { proofData, viewingKeys, depositSigningData, txId };
  }
}
