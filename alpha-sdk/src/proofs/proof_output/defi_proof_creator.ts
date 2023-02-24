import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { JoinSplitProver, JoinSplitTx, ProofData } from '@aztec/barretenberg/client_proofs';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { OffchainDefiDepositData } from '@aztec/barretenberg/offchain_tx_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { CoreDefiTx } from '../../core_tx/index.js';

const debug = createDebugLogger('bb:defi_proof_creator');

export class DefiProofCreator {
  constructor(private prover: JoinSplitProver, private noteAlgos: NoteAlgorithms) {}

  public async createProof(
    tx: JoinSplitTx,
    viewingKey: ViewingKey,
    partialStateSecretEphPubKey: GrumpkinAddress,
    signature: SchnorrSignature,
    txRefNo: number,
    timeout?: number,
  ) {
    debug('creating proof...');
    const start = new Date().getTime();
    tx.signature = signature!;
    const proof = await this.prover.createProof(tx, timeout);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const proofData = new ProofData(proof);
    const txId = new TxId(proofData.txId);
    const {
      outputNotes,
      claimNote: { value: depositValue, bridgeCallData, partialStateSecret },
    } = tx;
    const txFee = toBigIntBE(proofData.txFee);
    const { ownerPubKey: accountPublicKey, accountRequired } = outputNotes[1];
    const coreTx = new CoreDefiTx(txId, accountPublicKey, bridgeCallData, depositValue, txFee, txRefNo, new Date());
    const partialState = this.noteAlgos.valueNotePartialCommitment(
      partialStateSecret,
      accountPublicKey,
      accountRequired,
    );
    const offchainTxData = new OffchainDefiDepositData(
      bridgeCallData,
      partialState,
      partialStateSecretEphPubKey,
      depositValue,
      txFee,
      viewingKey,
      txRefNo,
    );

    return {
      tx: coreTx,
      proofData,
      offchainTxData,
    };
  }
}
