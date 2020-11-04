import { Length, Max } from 'class-validator';
import { Field, Int, ObjectType, InputType, ArgsType } from 'type-graphql';
import { Sort, MAX_COUNT } from './query_builder';
import { RollupType } from './rollup_type';
import { HexString, ISODateTime } from './scalar_type';

@ObjectType()
export class TxType {
  @Field(() => HexString)
  @Length(32)
  txId!: string;

  @Field(() => Int)
  txNo!: number;

  @Field(() => RollupType, { nullable: true })
  rollup?: RollupType;

  @Field(() => HexString)
  proofData!: string;

  @Field(() => Int)
  proofId!: number;

  @Field(() => HexString)
  publicInput!: string;

  @Field(() => HexString)
  publicOutput!: string;

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

/* eslint-disable camelcase */
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

  @Field(() => HexString, { nullable: true })
  txId_starts_with?: string;

  @Field(() => HexString, { nullable: true })
  txId_ends_with?: string;

  @Field(() => HexString, { nullable: true })
  txId_contains?: string;

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
/* eslint-enable */

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

@ArgsType()
export class TxCountArgs {
  @Field(() => TxFilter, { nullable: true })
  where?: TxFilter;
}
