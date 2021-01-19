import { Max } from 'class-validator';
import { Field, Int, ObjectType, ArgsType, InputType } from 'type-graphql';
import { TxType } from './tx_type';
import { MAX_COUNT, Sort } from './query_builder';
import { HexString, ISODateTime } from './scalar_type';

@ObjectType()
export class RollupType {
  @Field(() => Int)
  id!: number;

  @Field(() => HexString)
  hash!: string;

  @Field(() => HexString)
  proofData?: string;

  @Field(() => HexString)
  dataRoot!: string;

  @Field(() => HexString)
  oldDataRoot?: string;

  @Field(() => HexString)
  nullifierRoot?: string;

  @Field(() => HexString)
  oldNullifierRoot?: string;

  @Field(() => HexString)
  dataRootsRoot?: string;

  @Field(() => HexString)
  oldDataRootsRoot?: string;

  @Field(() => Int)
  numTxs!: number;

  @Field(() => [TxType!])
  txs!: TxType[];

  @Field(() => HexString, { nullable: true })
  ethTxHash?: string;

  @Field(() => ISODateTime)
  created!: Date;

  @Field(() => ISODateTime, { nullable: true })
  mined!: Date;
}

/* eslint-disable camelcase */
@InputType()
class RollupFilter {
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
  hash?: string;

  @Field(() => HexString, { nullable: true })
  hash_not?: string;

  @Field(() => [HexString!], { nullable: true })
  hash_in?: string[];

  @Field(() => [HexString!], { nullable: true })
  hash_not_in?: string[];

  @Field(() => HexString, { nullable: true })
  hash_starts_with?: string;

  @Field(() => HexString, { nullable: true })
  hash_ends_with?: string;

  @Field(() => HexString, { nullable: true })
  hash_contains?: string;

  @Field(() => HexString, { nullable: true })
  dataRoot?: string;

  @Field(() => HexString, { nullable: true })
  dataRoot_not?: string;

  @Field({ nullable: true })
  dataRoot_null?: boolean;

  @Field({ nullable: true })
  dataRoot_not_null?: boolean;

  @Field(() => [HexString!], { nullable: true })
  dataRoot_in?: string[];

  @Field(() => [HexString!], { nullable: true })
  dataRoot_not_in?: string[];

  @Field(() => HexString, { nullable: true })
  dataRoot_starts_with?: string;

  @Field(() => HexString, { nullable: true })
  dataRoot_ends_with?: string;

  @Field(() => HexString, { nullable: true })
  dataRoot_contains?: string;

  @Field(() => HexString, { nullable: true })
  ethTxHash?: string;

  @Field(() => HexString, { nullable: true })
  ethTxHash_not?: string;

  @Field({ nullable: true })
  ethTxHash_null?: boolean;

  @Field({ nullable: true })
  ethTxHash_not_null?: boolean;

  @Field(() => [HexString!], { nullable: true })
  ethTxHash_in?: string[];

  @Field(() => [HexString!], { nullable: true })
  ethTxHash_not_in?: string[];

  @Field(() => HexString, { nullable: true })
  ethTxHash_starts_with?: string;

  @Field(() => HexString, { nullable: true })
  ethTxHash_ends_with?: string;

  @Field(() => HexString, { nullable: true })
  ethTxHash_contains?: string;

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

  @Field(() => ISODateTime, { nullable: true })
  mined?: Date;

  @Field(() => ISODateTime, { nullable: true })
  mined_not?: Date;

  @Field({ nullable: true })
  mined_null?: boolean;

  @Field({ nullable: true })
  mined_not_null?: boolean;

  @Field(() => [ISODateTime!], { nullable: true })
  mined_in?: Date[];

  @Field(() => [ISODateTime!], { nullable: true })
  mined_not_in?: Date[];

  @Field(() => ISODateTime, { nullable: true })
  mined_gt?: Date;

  @Field(() => ISODateTime, { nullable: true })
  mined_gte?: Date;

  @Field(() => ISODateTime, { nullable: true })
  mined_lt?: Date;

  @Field(() => ISODateTime, { nullable: true })
  mined_lte?: Date;
}
/* eslint-enable */

@InputType()
class RollupOrder {
  @Field({ nullable: true })
  id?: Sort;

  @Field({ nullable: true })
  created?: Sort;

  @Field({ nullable: true })
  mined?: Sort;
}

@ArgsType()
export class RollupsArgs {
  @Field(() => RollupFilter, { nullable: true })
  where?: RollupFilter;

  @Field({ defaultValue: { id: 'DESC' } })
  order?: RollupOrder;

  @Field(() => Int, { defaultValue: 0 })
  skip?: number;

  @Field(() => Int, { defaultValue: MAX_COUNT })
  @Max(MAX_COUNT)
  take?: number;
}

@ArgsType()
export class RollupCountArgs {
  @Field(() => RollupFilter, { nullable: true })
  where?: RollupFilter;
}
