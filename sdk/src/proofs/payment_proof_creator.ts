import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress } from '@aztec/barretenberg/address';
import { JoinSplitProver, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainJoinSplitData } from '@aztec/barretenberg/offchain_tx_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { WorldState } from '@aztec/barretenberg/world_state';
import createDebug from 'debug';
import { CorePaymentTx as PaymentTx } from '../core_tx';
import { Database } from '../database';
import { Signer } from '../signer';
import { UserState } from '../user_state';
import { JoinSplitTxFactory } from './join_split_tx_factory';
import { ProofOutput } from './proof_output';

const debug = createDebug('bb:payment_proof_creator');

export class PaymentProofCreator {
  private txFactory: JoinSplitTxFactory;

  constructor(
    private prover: JoinSplitProver,
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
    assetId: number,
    signer: Signer,
    newNoteOwner: AccountId | undefined,
    publicOwner: EthAddress | undefined,
    allowChain: number,
    txRefNo: number,
  ): Promise<ProofOutput> {
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
        allowChain,
      },
    );

    const signingData = await this.prover.computeSigningData(tx);
    const signature = await signer.signMessage(signingData);

    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await this.prover.createProof(tx, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const proofData = new ProofData(proof);
    const txId = new TxId(proofData.txId);
    const coreTx = new PaymentTx(
      txId,
      user.id,
      proofId,
      assetId,
      publicInput + publicOutput,
      publicOwner,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      !!(recipientPrivateOutput && newNoteOwner?.equals(user.id)),
      true, // isSender
      txRefNo,
      new Date(),
    );
    const offchainTxData = new OffchainJoinSplitData(viewingKeys, txRefNo);

    return { tx: coreTx, proofData, offchainTxData, outputNotes };
  }
}
