import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { JoinSplitProofData, JoinSplitProver, ProofData } from '@aztec/barretenberg/client_proofs';
import { Pedersen } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
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
    defiDepositValue: bigint,
    assetId: AssetId,
    signer: Signer,
    newNoteOwner?: AccountId,
    inputOwner?: EthAddress,
    outputOwner?: EthAddress,
    bridgeId?: BridgeId,
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
      defiDepositValue,
      assetId,
      signer,
      newNoteOwner,
      inputOwner,
      outputOwner,
      bridgeId,
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
