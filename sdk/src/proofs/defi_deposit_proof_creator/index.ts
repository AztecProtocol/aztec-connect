import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ClientProofData, JoinSplitProver } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainDefiDepositData } from '@aztec/barretenberg/offchain_tx_data';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { WorldState } from '@aztec/barretenberg/world_state';
import createDebug from 'debug';
import { Database } from '../../database';
import { Signer } from '../../signer';
import { UserState } from '../../user_state';
import { UserDefiTx } from '../../user_tx';
import { JoinSplitTxFactory } from '../join_split_proof_creator/join_split_tx_factory';
import { DefiProofOutput } from '../proof_output';

const debug = createDebug('bb:defi_deposit_proof_creator');

export class DefiDepositProofCreator {
  private txFactory: JoinSplitTxFactory;

  constructor(
    private prover: JoinSplitProver,
    private noteAlgos: NoteAlgorithms,
    worldState: WorldState,
    grumpkin: Grumpkin,
    db: Database,
  ) {
    this.txFactory = new JoinSplitTxFactory(worldState, grumpkin, db);
  }

  public async createProof(
    userState: UserState,
    bridgeId: BridgeId,
    depositValue: bigint,
    txFee: bigint,
    signer: Signer,
  ) {
    const { tx, viewingKeys } = await this.txFactory.createJoinSplitTx(
      userState,
      BigInt(0),
      BigInt(0),
      depositValue + txFee,
      BigInt(0),
      BigInt(0),
      depositValue,
      bridgeId.inputAssetId,
      signer.getPublicKey(),
      undefined,
      undefined,
      undefined,
      bridgeId,
    );
    const signingData = await this.prover.computeSigningData(tx);
    const signature = await signer.signMessage(signingData);

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.prover.createProof(tx, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    const { txId } = new ClientProofData(proofData);
    const txHash = new TxHash(txId);
    const userId = userState.getUser().id;
    const userTx = new UserDefiTx(txHash, userId, bridgeId, depositValue, txFee, new Date());
    const partialState = this.noteAlgos.valueNotePartialCommitment(tx.claimNote.noteSecret, userId);
    const offchainTxData = new OffchainDefiDepositData(bridgeId, partialState, depositValue, txFee, viewingKeys[0]);

    return new DefiProofOutput(userTx, proofData, offchainTxData);
  }
}
