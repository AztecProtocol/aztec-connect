import { Length } from 'class-validator';
import { Field, Int, ObjectType } from 'type-graphql';
import { TxDao } from '../entity/tx';
import { RollupType, fromRollupDao } from './rollup_type';

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
