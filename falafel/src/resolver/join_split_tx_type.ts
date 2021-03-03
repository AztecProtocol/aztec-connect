import { Length } from 'class-validator';
import { Field, ObjectType } from 'type-graphql';
import { BigIntStr, HexString, ISODateTime } from './scalar_type';

@ObjectType()
export class JoinSplitTxType {
  @Field(() => HexString)
  @Length(32)
  id!: string;

  @Field(() => BigIntStr, { nullable: true })
  publicOutput?: string;

  @Field(() => BigIntStr, { nullable: true })
  publicInput?: string;

  @Field()
  assetId!: number;

  @Field()
  inputOwner?: string;

  @Field()
  outputOwner?: string;

  @Field(() => ISODateTime)
  created!: Date;
}
