import { Max } from 'class-validator';
import { ArgsType, Field, InputType, Int, ObjectType } from 'type-graphql';
import { MAX_COUNT, Sort } from './query_builder';
import { HexString, ISODateTime } from './scalar_type';
import { TxType } from './tx_type';

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

@InputType()
class RollupOrder {
  @Field({ nullable: true })
  id?: Sort;
}

@ArgsType()
export class RollupsArgs {
  @Field(() => RollupOrder, { nullable: true })
  order?: RollupOrder;

  @Field(() => Int, { defaultValue: 0 })
  skip?: number;

  @Field(() => Int, { defaultValue: MAX_COUNT })
  @Max(MAX_COUNT)
  take?: number;
}
