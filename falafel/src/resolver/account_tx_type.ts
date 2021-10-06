import { Field, Int, ObjectType } from 'type-graphql';
import { HexString } from './scalar_type';

@ObjectType()
export class AccountTxType {
  @Field(() => HexString)
  accountPubKey!: string;

  @Field(() => HexString)
  aliasHash!: string;

  @Field(() => Int)
  nonce!: number;
}
