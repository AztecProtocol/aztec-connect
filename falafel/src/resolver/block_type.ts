import { Max } from 'class-validator';
import { Field, Int, ObjectType, ArgsType, InputType } from 'type-graphql';
import { MAX_COUNT, Sort } from './query_builder';
import { HexString, ISODateTime } from './scalar_type';

@ObjectType()
export class BlockType {
  @Field(() => Int)
  id!: number;

  @Field(() => HexString, { nullable: true })
  txHash!: string;

  @Field(() => Int)
  rollupId!: number;

  @Field(() => Int)
  rollupSize!: number;

  @Field(() => HexString)
  rollupProofData!: string;

  @Field(() => HexString)
  viewingKeysData!: string;

  @Field(() => ISODateTime)
  created!: Date;
}

/* eslint-disable camelcase */
@InputType()
class BlockFilter {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => Int, { nullable: true })
  id_not?: number;

  @Field(() => [Int!], { nullable: true })
  id_in?: number[];

  @Field(() => [Int!], { nullable: true })
  id_not_in?: number[];

  @Field(() => Int, { nullable: true })
  id_gt?: number;

  @Field(() => Int, { nullable: true })
  id_gte?: number;

  @Field(() => Int, { nullable: true })
  id_lt?: number;

  @Field(() => Int, { nullable: true })
  id_lte?: number;

  @Field(() => HexString, { nullable: true })
  txHash?: string;

  @Field(() => HexString, { nullable: true })
  txHash_not?: string;

  @Field(() => [HexString!], { nullable: true })
  txHash_in?: string[];

  @Field(() => [HexString!], { nullable: true })
  txHash_not_in?: string[];

  @Field(() => HexString, { nullable: true })
  txHash_starts_with?: string;

  @Field(() => HexString, { nullable: true })
  txHash_ends_with?: string;

  @Field(() => HexString, { nullable: true })
  txHash_contains?: string;

  @Field(() => Int, { nullable: true })
  rollupId?: number;

  @Field(() => Int, { nullable: true })
  rollupId_not?: number;

  @Field(() => [Int!], { nullable: true })
  rollupId_in?: number[];

  @Field(() => [Int!], { nullable: true })
  rollupId_not_in?: number[];

  @Field(() => Int, { nullable: true })
  rollupId_gt?: number;

  @Field(() => Int, { nullable: true })
  rollupId_gte?: number;

  @Field(() => Int, { nullable: true })
  rollupId_lt?: number;

  @Field(() => Int, { nullable: true })
  rollupId_lte?: number;

  @Field(() => Int, { nullable: true })
  rollupSize?: number;

  @Field(() => Int, { nullable: true })
  rollupSize_not?: number;

  @Field(() => [Int!], { nullable: true })
  rollupSize_in?: number[];

  @Field(() => [Int!], { nullable: true })
  rollupSize_not_in?: number[];

  @Field(() => Int, { nullable: true })
  rollupSize_gt?: number;

  @Field(() => Int, { nullable: true })
  rollupSize_gte?: number;

  @Field(() => Int, { nullable: true })
  rollupSize_lt?: number;

  @Field(() => Int, { nullable: true })
  rollupSize_lte?: number;

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
/* eslint-enable */

@InputType()
class BlockOrder {
  @Field({ nullable: true })
  id?: Sort;

  @Field({ nullable: true })
  rollupId?: Sort;

  @Field({ nullable: true })
  rollupSize?: Sort;

  @Field({ nullable: true })
  created?: Sort;
}

@ArgsType()
export class BlocksArgs {
  @Field(() => BlockFilter, { nullable: true })
  where?: BlockFilter;

  @Field({ defaultValue: { id: 'DESC' } })
  order?: BlockOrder;

  @Field(() => Int, { defaultValue: 0 })
  skip?: number;

  @Field(() => Int, { defaultValue: MAX_COUNT })
  @Max(MAX_COUNT)
  take?: number;
}

@ArgsType()
export class BlockCountArgs {
  @Field(() => BlockFilter, { nullable: true })
  where?: BlockFilter;
}
