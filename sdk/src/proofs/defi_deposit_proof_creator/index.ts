import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { JoinSplitProver, ProofData } from '@aztec/barretenberg/client_proofs';
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
    this.txFactory = new JoinSplitTxFactory(noteAlgos, worldState, grumpkin, db);
  }

  public async createProof(
    userState: UserState,
    bridgeId: BridgeId,
    depositValue: bigint,
    txFee: bigint,
    signer: Signer,
    propagatedInputIndex?: number,
    backwardLink?: Buffer,
    allowChain?: number,
  ) {
    const { tx, viewingKeys, partialStateSecretEphPubKey } = await this.txFactory.createJoinSplitTx(
      userState,
      BigInt(0), // publicInput
      BigInt(0), // publicOutput
      depositValue + txFee, // privateInput
      BigInt(0), // recipientPrivateOutput
      BigInt(0), // senderPrivateOutput
      depositValue, // defiDepositValue
      bridgeId.inputAssetId,
      signer.getPublicKey(),
      undefined, // newNoteOwner
      undefined, // publicOwner
      propagatedInputIndex,
      backwardLink,
      allowChain,
      bridgeId,
    );
    const signingData = await this.prover.computeSigningData(tx);
    const signature = await signer.signMessage(signingData);

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.prover.createProof(tx, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    const { txId } = new ProofData(proofData);
    const txHash = new TxHash(txId);
    const userId = userState.getUser().id;
    const {
      claimNote: { partialStateSecret },
    } = tx;
    const userTx = new UserDefiTx(txHash, userId, bridgeId, depositValue, partialStateSecret, txFee, new Date());
    const partialState = this.noteAlgos.valueNotePartialCommitment(partialStateSecret, userId);
    const offchainTxData = new OffchainDefiDepositData(
      bridgeId,
      partialState,
      partialStateSecretEphPubKey!,
      depositValue,
      txFee,
      viewingKeys[0], // contains [value, asset_id, nonce, creatorPubKey] of the change note (returned to the sender)
    );

    return new DefiProofOutput(userTx, proofData, offchainTxData);
  }
}
