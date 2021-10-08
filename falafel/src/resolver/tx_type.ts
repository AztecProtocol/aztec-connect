import { Length } from 'class-validator';
import { Field, Int, ObjectType } from 'type-graphql';
import { HexString, ISODateTime } from './scalar_type';

@ObjectType()
export class MinimalRollupType {
  @Field(() => Int)
  id!: number;

  @Field(() => HexString)
  hash!: string;

  @Field(() => HexString, { nullable: true })
  ethTxHash?: string;

  @Field(() => ISODateTime)
  created!: Date;

  @Field(() => ISODateTime, { nullable: true })
  mined!: Date;
}

@ObjectType()
export class TxType {
  @Field(() => HexString)
  @Length(32)
  id!: string;

  @Field(() => MinimalRollupType, { nullable: true })
  rollup?: MinimalRollupType;

  @Field(() => HexString)
  proofData!: string;

  @Field(() => Int)
  proofId!: number;

  @Field(() => HexString)
  publicInput!: string;

  @Field(() => HexString)
  publicOutput!: string;

  @Field(() => HexString)
  assetId!: string;

  @Field(() => HexString)
  newNote1!: string;

  @Field(() => HexString)
  newNote2!: string;

  @Field(() => HexString)
  nullifier1!: string;

  @Field(() => HexString)
  nullifier2!: string;

  @Field(() => HexString)
  inputOwner!: string;

  @Field(() => HexString)
  outputOwner!: string;

  @Field(() => HexString)
  viewingKey1!: string;

  @Field(() => HexString)
  viewingKey2!: string;

  @Field(() => HexString, { nullable: true })
  signature?: string;

  @Field(() => ISODateTime)
  created!: Date;
}
