import { Max } from 'class-validator';
import { Field, Int, ObjectType, ArgsType, InputType } from 'type-graphql';
import { BlockDao } from '../entity/block';
import { MAX_COUNT, Sort } from './query_builder';
import { HexString, ISODateTime } from './scalar_type';

@ObjectType()
export class BlockType {
  @Field(() => Int)
  id!: number;

  @Field({ nullable: true })
  txHash!: string;

  @Field(() => Int)
  rollupSize!: number;

  @Field()
  rollupProofData!: string;

  @Field()
  viewingKeysData!: string;

  @Field()
  created!: Date;
}

export const fromBlockDao = ({ id, txHash, rollupSize, rollupProofData, viewingKeysData, created }: BlockDao) => ({
  id,
  txHash: txHash.toString('hex'),
  rollupSize,
  rollupProofData: rollupProofData.toString('hex'),
  viewingKeysData: viewingKeysData.toString('hex'),
  created,
});

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

@InputType()
class BlockOrder {
  @Field({ nullable: true })
  id?: Sort;

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
