import { AccountProver, AccountTx, ProofData } from '@aztec/barretenberg/client_proofs';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreAccountTx } from '../../core_tx/index.js';

const debug = createDebugLogger('bb:account_proof_creator');

export class AccountProofCreator {
  constructor(private prover: AccountProver) {}

  public async createProof(tx: AccountTx, signature: SchnorrSignature, txRefNo: number, timeout?: number) {
    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await this.prover.createAccountProof(tx, signature, timeout);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const proofData = new ProofData(proof);
    const txId = new TxId(proofData.txId);
    const { aliasHash, newAccountPublicKey, newSpendingPublicKey1, newSpendingPublicKey2, migrate } = tx;
    const coreTx = new CoreAccountTx(
      txId,
      newAccountPublicKey,
      aliasHash,
      newSpendingPublicKey1?.x(),
      newSpendingPublicKey2?.x(),
      migrate,
      txRefNo,
      new Date(),
    );
    const offchainTxData = new OffchainAccountData(
      newAccountPublicKey,
      aliasHash,
      newSpendingPublicKey1?.x(),
      newSpendingPublicKey2?.x(),
      txRefNo,
    );

    return { tx: coreTx, proofData, offchainTxData };
  }
}
