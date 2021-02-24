import { Length, Max } from 'class-validator';
import { ArgsType, Field, InputType, Int, ObjectType } from 'type-graphql';
import { MAX_COUNT, Sort } from './query_builder';
import { HexString, ISODateTime } from './scalar_type';

@ObjectType()
export class AccountTxType {
  @Field(() => HexString)
  @Length(32)
  id!: string;

  @Field(() => HexString)
  accountPubKey!: string;

  @Field(() => HexString)
  aliasHash!: string;

  @Field(() => Int)
  nonce!: number;

  @Field(() => HexString)
  spendingKey1!: string;

  @Field(() => HexString)
  spendingKey2!: string;

  @Field(() => ISODateTime)
  created!: Date;
}

@InputType()
class AccountTxFilter {
  @Field(() => HexString, { nullable: true })
  accountPubKey?: string;

  @Field(() => String, { nullable: true })
  alias?: string;
}

@InputType()
class AccountTxOrder {
  @Field({ nullable: true })
  nonce?: Sort;
}

@ArgsType()
export class AccountTxsArgs {
  @Field(() => AccountTxFilter, { nullable: true })
  where?: AccountTxFilter;

  @Field(() => AccountTxOrder, { nullable: true })
  order?: AccountTxOrder;

  @Field(() => Int, { defaultValue: 0 })
  skip?: number;

  @Field(() => Int, { defaultValue: MAX_COUNT })
  @Max(MAX_COUNT)
  take?: number;
}
