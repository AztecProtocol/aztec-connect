import { Length } from 'class-validator';
import { Field, ObjectType } from 'type-graphql';
import { BigIntStr, HexString, ISODateTime } from './scalar_type';

@ObjectType()
export class JoinSplitTxType {
  @Field(() => HexString)
  @Length(32)
  id!: string;

  @Field(() => BigIntStr)
  publicOutput?: string;

  @Field(() => BigIntStr)
  publicInput?: string;

  @Field()
  assetId!: number;

  @Field(() => HexString)
  inputOwner?: string;

  @Field(() => HexString)
  outputOwner?: string;

  @Field(() => ISODateTime)
  created!: Date;
}