import { RollupStatus } from 'barretenberg/rollup_provider';
import { Max } from 'class-validator';
import { Field, Int, ObjectType, ArgsType, InputType } from 'type-graphql';
import { BlockType } from './block_type';
import { TxType } from './tx_type';
import { MAX_COUNT, Sort } from './query_builder';
import { HexString, ISODateTime, RollupStatusScalarType } from './scalar_type';

@ObjectType()
export class RollupType {
  @Field(() => Int)
  id!: number;

  @Field(() => HexString, { nullable: true })
  proofData?: string;

  @Field(() => HexString)
  dataRoot!: string;

  @Field(() => HexString, { nullable: true })
  oldDataRoot?: string;

  @Field(() => HexString, { nullable: true })
  nullifierRoot?: string;

  @Field(() => HexString, { nullable: true })
  oldNullifierRoot?: string;

  @Field(() => HexString, { nullable: true })
  dataRootsRoot?: string;

  @Field(() => HexString, { nullable: true })
  oldDataRootsRoot?: string;

  @Field(() => Int)
  numTxs!: number;

  @Field(() => [TxType!])
  txs!: TxType[];

  @Field(() => Int, { nullable: true })
  ethBlock?: number;

  @Field(() => HexString, { nullable: true })
  ethTxHash?: string;

  @Field({ nullable: true })
  block?: BlockType;

  @Field(() => RollupStatusScalarType)
  status!: RollupStatus;

  @Field(() => ISODateTime)
  created!: Date;
}

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

  @Field(() => Int, { nullable: true })
  ethBlock?: number;

  @Field(() => Int, { nullable: true })
  ethBlock_not?: number;

  @Field({ nullable: true })
  ethBlock_null?: boolean;

  @Field({ nullable: true })
  ethBlock_not_null?: boolean;

  @Field(() => [Int!], { nullable: true })
  ethBlock_in?: number[];

  @Field(() => [Int!], { nullable: true })
  ethBlock_not_in?: number[];

  @Field(() => Int, { nullable: true })
  ethBlock_gt?: number;

  @Field(() => Int, { nullable: true })
  ethBlock_gte?: number;

  @Field(() => Int, { nullable: true })
  ethBlock_lt?: number;

  @Field(() => Int, { nullable: true })
  ethBlock_lte?: number;

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

  @Field(() => RollupStatusScalarType, { nullable: true })
  status?: RollupStatus;

  @Field(() => RollupStatusScalarType, { nullable: true })
  status_not?: RollupStatus;

  @Field(() => [RollupStatusScalarType!], { nullable: true })
  status_in?: RollupStatus[];

  @Field(() => [RollupStatusScalarType!], { nullable: true })
  status_not_in?: RollupStatus[];

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
class RollupOrder {
  @Field({ nullable: true })
  id?: Sort;

  @Field({ nullable: true })
  ethBlock?: Sort;

  @Field({ nullable: true })
  created?: Sort;
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
