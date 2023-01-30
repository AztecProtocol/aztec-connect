import { JoinSplitProver, JoinSplitTx, ProofData } from '@aztec/barretenberg/client_proofs';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { OffchainJoinSplitData } from '@aztec/barretenberg/offchain_tx_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { CorePaymentTx } from '../../core_tx/index.js';

const debug = createDebugLogger('bb:payment_proof_creator');

export class PaymentProofCreator {
  constructor(private prover: JoinSplitProver) {}

  public async createProof(
    tx: JoinSplitTx,
    viewingKeys: ViewingKey[],
    signature: SchnorrSignature,
    txRefNo: number,
    timeout?: number,
  ) {
    debug('creating proof...');
    const start = new Date().getTime();
    tx.signature = signature;
    const proof = await this.prover.createProof(tx, timeout);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const proofData = new ProofData(proof);
    const txId = new TxId(proofData.txId);
    const {
      inputNotes,
      outputNotes: [valueNote, changeNote],
      proofId,
      publicValue,
      publicOwner,
    } = tx;
    const privateInput = inputNotes.reduce((sum, n) => sum + n.value, BigInt(0));
    const { value: recipientPrivateOutput } = valueNote;
    const { assetId, value: senderPrivateOutput } = changeNote;
    const newNoteOwner = valueNote.ownerPubKey;
    const accountPublicKey = changeNote.ownerPubKey;
    const isRecipient = newNoteOwner.equals(accountPublicKey);
    const isSender = true;
    const coreTx = new CorePaymentTx(
      txId,
      accountPublicKey,
      proofId,
      assetId,
      publicValue,
      publicOwner,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      isRecipient,
      isSender,
      txRefNo,
      new Date(),
    );

    const offchainTxData = new OffchainJoinSplitData(viewingKeys, txRefNo);

    return {
      tx: coreTx,
      proofData,
      offchainTxData,
    };
  }
}
