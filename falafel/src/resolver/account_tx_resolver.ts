import { AliasHash } from 'barretenberg/client_proofs/alias_hash';
import { Blake2s } from 'barretenberg/crypto/blake2s';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { Arg, Args, Query, Resolver } from 'type-graphql';
import { Inject } from 'typedi';
import { Connection, Repository } from 'typeorm';
import { AccountTxDao } from '../entity/account_tx';
import { AccountTxsArgs, AccountTxType } from './account_tx_type';
import { getQuery, pickOne } from './query_builder';
import { HexString } from './scalar_type';

@Resolver(() => AccountTxType)
export class AccountTxResolver {
  private readonly accountTxRep: Repository<AccountTxDao>;
  private blake: Blake2s;

  constructor(@Inject('connection') connection: Connection, @Inject('barretenberg') barretenberg: BarretenbergWasm) {
    this.accountTxRep = connection.getRepository(AccountTxDao);
    this.blake = new Blake2s(barretenberg);
  }

  @Query(() => AccountTxType, { nullable: true })
  async accountTx(
    @Arg('accountPubKey', () => HexString, { nullable: true }) accountPubKey?: Buffer,
    @Arg('alias', () => String, { nullable: true }) alias?: string,
  ) {
    if (alias) {
      const aliasHash = AliasHash.fromAlias(alias, this.blake).toBuffer();
      return this.accountTxRep.findOne({ aliasHash });
    }
    return this.accountTxRep.findOne({ accountPubKey });
  }

  @Query(() => [AccountTxType!])
  async accountTxs(@Args() { where, ...args }: AccountTxsArgs) {
    const { alias, ...filters } = where || {};
    if (alias) {
      const aliasHash = AliasHash.fromAlias(alias, this.blake).toBuffer();
      return getQuery(this.accountTxRep, { where: { aliasHash }, ...args }).getMany();
    }
    return getQuery(this.accountTxRep, { where: pickOne(filters), ...args }).getMany();
  }
}
