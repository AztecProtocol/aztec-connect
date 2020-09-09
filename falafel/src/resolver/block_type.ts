import { Field, Int, ObjectType } from 'type-graphql';
import { BlockDao } from '../entity/block';

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

export const toBlockType = ({
  id,
  txHash,
  rollupSize,
  rollupProofData,
  viewingKeysData,
  created,
}: BlockDao): BlockType => ({
  id,
  txHash: txHash.toString('hex'),
  rollupSize,
  rollupProofData: rollupProofData.toString('hex'),
  viewingKeysData: viewingKeysData.toString('hex'),
  created,
});
