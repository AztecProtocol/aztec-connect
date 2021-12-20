import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { AccountProofData, ProofData } from 'barretenberg/client_proofs/proof_data';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { Arg, Query, Resolver } from 'type-graphql';
import { Inject } from 'typedi';
import { AccountDao, TxDao } from '../entity';
import { CachedRollupDb } from '../rollup_db';
import { AccountTxType } from './account_tx_type';
import { HexString } from './scalar_type';

const txDaoToAccountDao = (txDao: TxDao): AccountDao => {
  const accountProof = new AccountProofData(new ProofData(txDao.proofData));
  return {
    accountPubKey: accountProof.publicKey,
    aliasHash: accountProof.accountAliasId.aliasHash.toBuffer(),
    nonce: accountProof.accountAliasId.nonce,
    tx: txDao,
  };
};

@Resolver(() => AccountTxType)
export class AccountTxResolver {
  private blake: Blake2s;

  constructor(
    @Inject('barretenberg') barretenberg: BarretenbergWasm,
    @Inject('rollupDb') private rollupDb: CachedRollupDb,
  ) {
    this.blake = new Blake2s(barretenberg);
  }

  @Query(() => AccountTxType, { nullable: true })
  async accountTx(
    @Arg('accountPubKey', () => HexString, { nullable: true }) accountPubKey?: Buffer,
    @Arg('alias', () => String, { nullable: true }) alias?: string,
  ) {
    if (alias) {
      const aliasHash = AliasHash.fromAlias(alias, this.blake).toBuffer();
      return this.rollupDb.getAccountTx(aliasHash);
    }
    if (accountPubKey) {
      return this.rollupDb.getLatestAccountTx(accountPubKey);
    }
  }

  @Query(() => [AccountTxType!])
  async unsettledAccountTxs() {
    return (await this.rollupDb.getUnsettledAccountTxs()).map(txDaoToAccountDao);
  }
}
