import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AccountProver, AccountTx, ProofData } from '@aztec/barretenberg/client_proofs';
import { createLogger } from '@aztec/barretenberg/debug';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { WorldState, WorldStateConstants } from '@aztec/barretenberg/world_state';
import { CoreAccountTx } from '../core_tx';
import { Database } from '../database';
import { AccountProofInput } from './proof_input';
import { ProofOutput } from './proof_output';

const debug = createLogger('bb:account_proof');

export class AccountProofCreator {
  constructor(private prover: AccountProver, private worldState: WorldState, private db: Database) {}

  public async createProofInput(
    accountPublicKey: GrumpkinAddress,
    aliasHash: AliasHash,
    migrate: boolean,
    spendingPublicKey: GrumpkinAddress,
    newAccountPublicKey: GrumpkinAddress | undefined,
    newSpendingPublicKey1: GrumpkinAddress | undefined,
    newSpendingPublicKey2: GrumpkinAddress | undefined,
    spendingKeyExists = true,
  ): Promise<AccountProofInput> {
    const create = accountPublicKey.equals(spendingPublicKey);
    const merkleRoot = this.worldState.getRoot();
    const { path: accountPath, index: accountIndex } = await this.getAccountPathAndIndex(
      accountPublicKey,
      spendingKeyExists ? spendingPublicKey : accountPublicKey,
    );

    const tx = new AccountTx(
      merkleRoot,
      accountPublicKey,
      newAccountPublicKey || accountPublicKey,
      newSpendingPublicKey1 || GrumpkinAddress.ZERO,
      newSpendingPublicKey2 || GrumpkinAddress.ZERO,
      aliasHash,
      create,
      migrate,
      accountIndex,
      accountPath,
      spendingPublicKey,
    );

    const signingData = await this.prover.computeSigningData(tx);

    return { tx, signingData };
  }

  public async createProof({ tx, signature }: AccountProofInput, txRefNo: number): Promise<ProofOutput> {
    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await this.prover.createAccountProof(tx, signature!);
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

    return { tx: coreTx, proofData, offchainTxData, outputNotes: [] };
  }

  private async getAccountPathAndIndex(accountPublicKey: GrumpkinAddress, spendingPublicKey: GrumpkinAddress) {
    if (spendingPublicKey.equals(accountPublicKey)) {
      return {
        path: this.worldState.buildZeroHashPath(WorldStateConstants.DATA_TREE_DEPTH),
        index: 0,
      };
    } else {
      const spendingKey = await this.db.getSpendingKey(accountPublicKey, spendingPublicKey);
      if (spendingKey === undefined) {
        throw new Error('Unknown spending key.');
      }
      const immutableHashPath = HashPath.fromBuffer(spendingKey.hashPath);
      const path = await this.worldState.buildFullHashPath(spendingKey.treeIndex, immutableHashPath);
      return {
        path,
        index: spendingKey.treeIndex,
      };
    }
  }
}
