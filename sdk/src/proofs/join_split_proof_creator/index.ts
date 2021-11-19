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
    allowChain = false,
  ) {
    if (publicInput && publicOutput) {
      throw new Error('Public values cannot be both greater than zero.');
    }

    if (publicOutput + recipientPrivateOutput + senderPrivateOutput > publicInput + privateInput) {
      throw new Error('Total output cannot be larger than total input.');
    }

    if (publicInput + publicOutput && !publicOwner) {
      throw new Error('Public owner undefined.');
    }

    if (recipientPrivateOutput && !newNoteOwner) {
      throw new Error('Note recipient undefined.');
    }

    const proofId = (() => {
      if (publicInput > 0) {
        return ProofId.DEPOSIT;
      }
      if (publicOutput > 0) {
        return ProofId.WITHDRAW;
      }
      return ProofId.SEND;
    })();

    const user = userState.getUser();

    const notes = privateInput ? await userState.pickNotes(assetId, privateInput) : [];
    if (!notes) {
      throw new Error(`Failed to find no more than 2 notes that sum to ${privateInput}.`);
    }

    const totalInputNoteValue = notes.reduce((sum, note) => sum + note.value, BigInt(0));
    const changeValue = totalInputNoteValue > privateInput ? totalInputNoteValue - privateInput : BigInt(0);

    const { tx, outputNotes, viewingKeys } = await this.txFactory.createTx(
      user,
      proofId,
      assetId,
      notes,
      signer.getPublicKey(),
      {
        publicValue: publicInput + publicOutput,
        publicOwner,
        outputNoteValue1: recipientPrivateOutput,
        outputNoteValue2: changeValue + senderPrivateOutput,
        newNoteOwner,
        allowChain: allowChain ? 2 : 0,
      },
    );

    const signingData = await this.joinSplitProver.computeSigningData(tx);
    const signature = await signer.signMessage(signingData);

    debug('creating proof...');
    const start = new Date().getTime();
    const proofData = await this.joinSplitProver.createProof(tx, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proofData.length}`);

    const { txId } = new ProofData(proofData);
    const txHash = new TxHash(txId);
    const userTx = new UserJoinSplitTx(
      txHash,
      user.id,
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

    return new JoinSplitProofOutput(userTx, outputNotes, proofData, offchainTxData);
  }
}
