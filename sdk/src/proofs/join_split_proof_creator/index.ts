import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { JoinSplitProver, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainJoinSplitData } from '@aztec/barretenberg/offchain_tx_data';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { WorldState } from '@aztec/barretenberg/world_state';
import createDebug from 'debug';
import { Database } from '../../database';
import { Signer } from '../../signer';
import { AccountId } from '../../user';
import { UserState } from '../../user_state';
import { UserJoinSplitTx } from '../../user_tx';
import { JoinSplitProofOutput } from '../proof_output';
import { JoinSplitTxFactory } from './join_split_tx_factory';

const debug = createDebug('bb:join_split_proof_creator');

export class JoinSplitProofCreator {
  private txFactory: JoinSplitTxFactory;

  constructor(
    private joinSplitProver: JoinSplitProver,
    noteAlgos: NoteAlgorithms,
    worldState: WorldState,
    grumpkin: Grumpkin,
    db: Database,
  ) {
    this.txFactory = new JoinSplitTxFactory(noteAlgos, worldState, grumpkin, db);
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
    newNoteOwner?: AccountId,
    publicOwner?: EthAddress,
    propagatedInputIndex?: number,
    backwardLink?: Buffer,
    allowChain?: number,
  ) {
    const { tx, viewingKeys } = await this.txFactory.createJoinSplitTx(
      userState,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      BigInt(0), // defiDepositValue
      assetId,
      signer.getPublicKey(),
      newNoteOwner,
      publicOwner,
      propagatedInputIndex,
      backwardLink,
      allowChain,
    );
    const signingData = await this.joinSplitProver.computeSigningData(tx);
    const signature = await signer.signMessage(signingData);

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.joinSplitProver.createProof(tx, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    const { txId, proofId } = new ProofData(proofData);
    const txHash = new TxHash(txId);
    const userId = userState.getUser().id;
    const userTx = new UserJoinSplitTx(
      txHash,
      userId,
      assetId,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      proofId === ProofId.DEPOSIT ? publicOwner : undefined,
      proofId === ProofId.WITHDRAW ? publicOwner : undefined,
      true, // ownedByUser
      new Date(),
    );
    const offchainTxData = new OffchainJoinSplitData(viewingKeys);

    return new JoinSplitProofOutput(userTx, proofData, offchainTxData);
  }
}
