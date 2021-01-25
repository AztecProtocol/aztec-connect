import { EthAddress } from 'barretenberg/address';
import { Blockchain } from 'barretenberg/blockchain';
import { AccountVerifier } from 'barretenberg/client_proofs/account_proof';
import { JoinSplitVerifier } from 'barretenberg/client_proofs/join_split_proof';
import { ProofId, ProofData } from 'barretenberg/client_proofs/proof_data';
import { Crs } from 'barretenberg/crs';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { BarretenbergWorker } from 'barretenberg/wasm/worker';
import { createWorker, destroyWorker } from 'barretenberg/wasm/worker_factory';
import { toBigIntBE } from 'bigint-buffer';
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

  constructor(private rollupDb: RollupDb, private blockchain: Blockchain, private minFees: bigint[]) {}

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
      case ProofId.JOIN_SPLIT:
        await this.validateJoinSplitTx(proof);
        break;
      case ProofId.ACCOUNT:
        await this.validateAccountTx(proof);
        break;
    }

    if (await this.rollupDb.nullifiersExist(proof.nullifier1, proof.nullifier2)) {
      throw new Error('Nullifier already exists.');
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
    const { publicInput, inputOwner, assetId, txFee } = proof;

    if (toBigIntBE(txFee) < this.minFees[assetId.readUInt32BE(28)]) {
      throw new Error('Insufficient fee.');
    }

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

      // TODO: WARNING! Need to sum outstanding deposits from this address and validate against the difference!
      // Otherwise user can do two proof deposits against the same funds.
      // We actually need an atomic "insert only if sum of existing + new tx is good value". Which probably isn't
      // possible in sqlite (need stored procedures). Given we only have the one service for now, we could put
      // a mutex around the entire receiveTx call and we side-step the race condition. But that is kinda clunky.
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
