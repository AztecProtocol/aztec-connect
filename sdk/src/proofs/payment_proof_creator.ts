import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { JoinSplitProver, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { createLogger } from '@aztec/barretenberg/debug';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainJoinSplitData } from '@aztec/barretenberg/offchain_tx_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { WorldState } from '@aztec/barretenberg/world_state';
import { CorePaymentTx as PaymentTx } from '../core_tx';
import { Database } from '../database';
import { Note } from '../note';
import { UserData } from '../user';
import { JoinSplitTxFactory } from './join_split_tx_factory';
import { JoinSplitProofInput } from './proof_input';

const debug = createLogger('bb:payment_proof_creator');

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

  public async createProofInput(
    user: UserData,
    inputNotes: Note[],
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    publicInput: bigint,
    publicOutput: bigint,
    assetId: number,
    newNoteOwner: AccountId | undefined,
    publicOwner: EthAddress | undefined,
    spendingPublicKey: GrumpkinAddress,
    allowChain: number,
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

    const totalInputNoteValue = inputNotes.reduce((sum, note) => sum + note.value, BigInt(0));
    const changeValue = totalInputNoteValue > privateInput ? totalInputNoteValue - privateInput : BigInt(0);

    const proofInput = await this.txFactory.createTx(user, proofId, assetId, inputNotes, spendingPublicKey, {
      publicValue: publicInput + publicOutput,
      publicOwner,
      outputNoteValue1: recipientPrivateOutput,
      outputNoteValue2: changeValue + senderPrivateOutput,
      newNoteOwner,
      allowChain,
    });

    const signingData = await this.prover.computeSigningData(proofInput.tx);

    return { ...proofInput, signingData };
  }

  public async createProof(user: UserData, { tx, signature, viewingKeys }: JoinSplitProofInput, txRefNo: number) {
    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await this.prover.createProof(tx, signature!);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const proofData = new ProofData(proof);
    const txId = new TxId(proofData.txId);

    const { inputNotes, outputNotes, proofId, publicValue, publicOwner } = tx;
    const privateInput = inputNotes.reduce((sum, n) => sum + n.value, BigInt(0));
    const { value: recipientPrivateOutput } = outputNotes[0];
    const { assetId, value: senderPrivateOutput } = outputNotes[1];
    const newNoteOwner = new AccountId(outputNotes[0].ownerPubKey, outputNotes[0].accountNonce);
    const userId = new AccountId(outputNotes[1].ownerPubKey, outputNotes[1].accountNonce);
    const coreTx = new PaymentTx(
      txId,
      userId,
      proofId,
      assetId,
      publicValue,
      publicOwner,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      newNoteOwner?.equals(userId),
      true, // isSender
      txRefNo,
      new Date(),
    );
    const offchainTxData = new OffchainJoinSplitData(viewingKeys, txRefNo);

    return {
      tx: coreTx,
      proofData,
      offchainTxData,
      outputNotes: [
        this.txFactory.generateNewNote(outputNotes[0], user.privateKey, { allowChain: proofData.allowChainFromNote1 }),
        this.txFactory.generateNewNote(outputNotes[1], user.privateKey, { allowChain: proofData.allowChainFromNote2 }),
      ],
    };
  }
}
