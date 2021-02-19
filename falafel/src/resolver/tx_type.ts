import { Length, Max } from 'class-validator';
import { ArgsType, Field, InputType, Int, ObjectType } from 'type-graphql';
import { MAX_COUNT } from './query_builder';
import { RollupType } from './rollup_type';
import { HexString, ISODateTime } from './scalar_type';

@ObjectType()
export class TxType {
  @Field(() => HexString)
  @Length(32)
  id!: string;

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

/* eslint-disable camelcase */
@InputType()
class TxFilter {
  @Field(() => HexString, { nullable: true })
  id_starts_with?: string;
  
  @Field({ nullable: true })
  rollup_null?: boolean;
}
/* eslint-enable */

@ArgsType()
export class TxsArgs {
  @Field(() => TxFilter, { nullable: true })
  where?: TxFilter;

  @Field(() => Int, { defaultValue: 0 })
  skip?: number;

  @Field(() => Int, { defaultValue: MAX_COUNT })
  @Max(MAX_COUNT)
  take?: number;
}
