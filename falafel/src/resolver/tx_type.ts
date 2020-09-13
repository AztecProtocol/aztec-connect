import { Length, Max } from 'class-validator';
import { Field, Int, ObjectType, InputType, ArgsType } from 'type-graphql';
import { TxDao } from '../entity/tx';
import { Sort, MAX_COUNT } from './query_builder';
import { RollupType } from './rollup_type';
import { HexString, ISODateTime } from './scalar_type';

@ObjectType()
export class TxType {
  @Field()
  @Length(32)
  txId!: string;

  @Field(() => RollupType, { nullable: true })
  rollup?: RollupType;

  @Field()
  proofData!: string;

  @Field(() => Int)
  proofId!: number;

  @Field()
  publicInput!: string;

  @Field()
  publicOutput!: string;

  @Field()
  newNote1!: string;

  @Field()
  newNote2!: string;

  @Field()
  nullifier1!: string;

  @Field()
  nullifier2!: string;

  @Field()
  inputOwner!: string;

  @Field()
  outputOwner!: string;

  @Field()
  viewingKey1!: string;

  @Field()
  viewingKey2!: string;

  @Field({ nullable: true })
  signature?: string;

  @Field()
  created!: Date;
}

export const fromTxDao = ({ txId, proofData, viewingKey1, viewingKey2, created }: TxDao) => ({
  txId: txId.toString('hex'),
  proofData: proofData.toString('hex'),
  viewingKey1: viewingKey1.toString('hex'),
  viewingKey2: viewingKey2.toString('hex'),
  created,
});

@InputType()
class TxFilter {
  @Field(() => HexString, { nullable: true })
  txId?: string;

  @Field(() => HexString, { nullable: true })
  txId_not?: string;

  @Field(() => [HexString!], { nullable: true })
  txId_in?: string[];

  @Field(() => [HexString!], { nullable: true })
  txId_not_in?: string[];

  @Field(() => Int, { nullable: true })
  rollup?: number;

  @Field(() => Int, { nullable: true })
  rollup_not?: number;

  @Field({ nullable: true })
  rollup_null?: boolean;

  @Field({ nullable: true })
  rollup_not_null?: boolean;

  @Field(() => [Int!], { nullable: true })
  rollup_in?: number[];

  @Field(() => [Int!], { nullable: true })
  rollup_not_in?: number[];

  @Field(() => Int, { nullable: true })
  rollup_gt?: number;

  @Field(() => Int, { nullable: true })
  rollup_gte?: number;

  @Field(() => Int, { nullable: true })
  rollup_lt?: number;

  @Field(() => Int, { nullable: true })
  rollup_lte?: number;

  @Field(() => ISODateTime, { nullable: true })
  created?: Date;

  @Field(() => ISODateTime, { nullable: true })
  created_not?: Date;

  @Field(() => [ISODateTime!], { nullable: true })
  created_in?: Date[];

  @Field(() => [ISODateTime!], { nullable: true })
  created_not_in?: Date[];

  @Field(() => ISODateTime, { nullable: true })
  created_gt?: Date;

  @Field(() => ISODateTime, { nullable: true })
  created_gte?: Date;

  @Field(() => ISODateTime, { nullable: true })
  created_lt?: Date;

  @Field(() => ISODateTime, { nullable: true })
  created_lte?: Date;
}

@InputType()
class TxOrder {
  @Field({ nullable: true })
  txId?: Sort;

  @Field({ nullable: true })
  rollup?: Sort;

  @Field({ nullable: true })
  created?: Sort;
}

@ArgsType()
export class TxsArgs {
  @Field(() => TxFilter, { nullable: true })
  where?: TxFilter;

  @Field({ defaultValue: { id: 'DESC' } })
  order?: TxOrder;

  @Field(() => Int, { defaultValue: 0 })
  skip?: number;

  @Field(() => Int, { defaultValue: MAX_COUNT })
  @Max(MAX_COUNT)
  take?: number;
}
