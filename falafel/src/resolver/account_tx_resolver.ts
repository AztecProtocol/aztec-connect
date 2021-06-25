import { AliasHash } from '@aztec/barretenberg/account_id';
import { AccountProofData, ProofData } from '@aztec/barretenberg/client_proofs';
import { Blake2s } from '@aztec/barretenberg/crypto';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { Arg, Args, Query, Resolver } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { AccountDao } from '../entity/account';
import { TxDao } from '../entity/tx';
import { CachedRollupDb } from '../rollup_db';
import { AccountTxsArgs, AccountTxType } from './account_tx_type';
import { getQuery, pickOne } from './query_builder';
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
  private readonly accountRep: Repository<AccountDao>;
  private blake: Blake2s;

  constructor(
    @Inject('connection') connection: Connection,
    @Inject('barretenberg') barretenberg: BarretenbergWasm,
    @Inject('rollupDb') private rollupDb: CachedRollupDb,
  ) {
    this.accountRep = connection.getRepository(AccountDao);
    this.blake = new Blake2s(barretenberg);
  }

  @Query(() => AccountTxType, { nullable: true })
  async accountTx(
    @Arg('accountPubKey', () => HexString, { nullable: true }) accountPubKey?: Buffer,
    @Arg('alias', () => String, { nullable: true }) alias?: string,
  ) {
    if (alias) {
      const aliasHash = AliasHash.fromAlias(alias, this.blake).toBuffer();
      return this.accountRep.findOne({ aliasHash });
    }
    return this.accountRep.findOne({ accountPubKey });
  }

  @Query(() => [AccountTxType!])
  async accountTxs(@Args() { where, ...args }: AccountTxsArgs) {
    const { alias, ...filters } = where || {};

    if (alias) {
      const aliasHash = AliasHash.fromAlias(alias, this.blake).toBuffer();
      return getQuery(this.accountRep, { where: { aliasHash }, ...args }).getMany();
    }
    return getQuery(this.accountRep, { where: pickOne(filters), ...args }).getMany();
  }

  @Query(() => [AccountTxType!])
  async unsettledAccountTxs() {
    return (await this.rollupDb.getUnsettledAccountTxs()).map(txDaoToAccountDao);
  }
}
