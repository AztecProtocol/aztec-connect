import { Length } from 'class-validator';
import { Field, ObjectType } from 'type-graphql';
import { TxDao } from '../entity/tx';
import { RollupType, toRollupType } from './rollup_type';

@ObjectType()
export class TxType {
  @Field()
  @Length(32)
  id!: string;

  @Field(() => RollupType)
  rollup?: RollupType;

  @Field()
  proofData!: string;

  @Field()
  viewingKey1!: string;

  @Field()
  viewingKey2!: string;

  @Field({ nullable: true })
  signature?: string;

  @Field()
  created!: Date;
}

export const toTxType = ({ txId, rollup, proofData, viewingKey1, viewingKey2, created }: TxDao): TxType => ({
  id: txId.toString('hex'),
  rollup: rollup ? toRollupType(rollup) : undefined,
  proofData: proofData.toString('hex'),
  viewingKey1: viewingKey1.toString('hex'),
  viewingKey2: viewingKey2.toString('hex'),
  created,
});
