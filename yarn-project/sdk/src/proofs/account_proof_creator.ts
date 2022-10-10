import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AccountProver, AccountTx, ProofData } from '@aztec/barretenberg/client_proofs';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { WorldState, WorldStateConstants } from '@aztec/barretenberg/world_state';
import { CoreAccountTx } from '../core_tx/index.js';
import { Database } from '../database/index.js';
import { AccountProofInput } from './proof_input.js';
import { ProofOutput } from './proof_output.js';

const debug = createDebugLogger('bb:account_proof');

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
    // Regarding `!migrate` check: see explanation in `getAccountPathAndIndex`
    const create = accountPublicKey.equals(spendingPublicKey) && !migrate;
    const merkleRoot = this.worldState.getRoot();
    const { path: accountPath, index: accountIndex } = await this.getAccountPathAndIndex(
      accountPublicKey,
      spendingKeyExists ? spendingPublicKey : accountPublicKey,
      migrate,
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

  private async getAccountPathAndIndex(
    accountPublicKey: GrumpkinAddress,
    spendingPublicKey: GrumpkinAddress,
    migrate: boolean,
  ) {
    // migrate flag explanation:
    // There is a system-wide assumption (enforced at account creation) that a user's registered spending keys and
    // account keys cannot match, and therefore if a user trys to spend using keys that match, they are performing an
    // "unregistered" action. I.e. they are spending notes which don't require a registered spending key. Unfortunately
    // when importing account registrations from the old system we didn't account for the fact that prior to June 2021
    // users had registrations with no spending keys (only an alias), and such dormant registrations ended up
    // inheriting their account keys as registered spending keys. In order to allow such accounts to migrate their
    // aliases, we have an expectional case in we perform the "registered" action instead of the "unregistered" action.
    if (spendingPublicKey.equals(accountPublicKey) && !migrate) {
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
