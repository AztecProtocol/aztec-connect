import { EthAddress } from 'barretenberg/address';
import { AccountVerifier } from 'barretenberg/client_proofs/account_proof';
import { JoinSplitVerifier } from 'barretenberg/client_proofs/join_split_proof';
import { ProofData } from 'barretenberg/client_proofs/proof_data';
import { Crs } from 'barretenberg/crs';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { BarretenbergWorker } from 'barretenberg/wasm/worker';
import { createWorker, destroyWorker } from 'barretenberg/wasm/worker_factory';
import { toBigIntBE } from 'bigint-buffer';
import { Blockchain } from 'blockchain';
import { readFile } from 'fs-extra';
import { TxDao } from './entity/tx';
import { RollupDb } from './rollup_db';

export interface Tx {
  proofData: Buffer;
  viewingKeys: Buffer[];
  depositSignature?: Buffer;
}

export class TxReceiver {
  private worker!: BarretenbergWorker;
  private joinSplitVerifier!: JoinSplitVerifier;
  private accountVerifier!: AccountVerifier;

  constructor(private rollupDb: RollupDb, private blockchain: Blockchain) {}

  public async init() {
    const crs = new Crs(0);
    await crs.downloadG2Data();

    const barretenberg = await BarretenbergWasm.new();
    this.worker = await createWorker('0', barretenberg.module);

    const jsKey = await readFile('./data/join_split/verification_key');
    this.joinSplitVerifier = new JoinSplitVerifier();
    await this.joinSplitVerifier.loadKey(this.worker, jsKey, crs.getG2Data());

    const accountKey = await readFile('./data/account/verification_key');
    this.accountVerifier = new AccountVerifier();
    await this.accountVerifier.loadKey(this.worker, accountKey, crs.getG2Data());
  }

  public async destroy() {
    await destroyWorker(this.worker);
  }

  public async receiveTx({ proofData, depositSignature, viewingKeys }: Tx) {
    const proof = new ProofData(proofData, viewingKeys, depositSignature);

    console.log(`Received tx: ${proof.txId.toString('hex')}`);

    // Check the proof is valid.
    switch (proof.proofId) {
      case 0:
        await this.validateJoinSplitTx(proof);
        break;
      case 1:
        await this.validateAccountTx(proof);
        break;
    }

    const dataRootsIndex = await this.rollupDb.getDataRootsIndex(proof.noteTreeRoot);

    const txDao = new TxDao({
      id: proof.txId,
      proofData,
      viewingKey1: viewingKeys[0] || Buffer.alloc(0),
      viewingKey2: viewingKeys[1] || Buffer.alloc(0),
      signature: depositSignature,
      nullifier1: proof.nullifier1,
      nullifier2: proof.nullifier2,
      dataRootsIndex,
      created: new Date(),
    });

    await this.rollupDb.addTx(txDao);

    return proof.txId;
  }

  private async validateJoinSplitTx(proof: ProofData) {
    const { publicInput, inputOwner, assetId } = proof;
    if (!(await this.joinSplitVerifier.verifyProof(proof.proofData))) {
      throw new Error('Join-split proof verification failed.');
    }

    if (toBigIntBE(publicInput) > 0n) {
      if (!proof.signature) {
        throw new Error('No deposit signature provided.');
      }

      const inputOwnerAddress = new EthAddress(inputOwner.slice(12));

      if (
        !(await this.blockchain.validateSignature(inputOwnerAddress, proof.signature, proof.getDepositSigningData()))
      ) {
        throw new Error('Invalid deposit signature.');
      }

      if (
        !(await this.blockchain.validateDepositFunds(
          inputOwnerAddress,
          toBigIntBE(publicInput),
          assetId.readUInt32BE(28),
        ))
      ) {
        throw new Error('User has insufficient or unapproved deposit balance.');
      }
    }
  }

  private async validateAccountTx(proof: ProofData) {
    if (!(await this.accountVerifier.verifyProof(proof.proofData))) {
      throw new Error('Account proof verification failed.');
    }
  }
}
