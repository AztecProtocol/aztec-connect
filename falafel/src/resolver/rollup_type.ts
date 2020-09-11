import { RollupStatus } from 'barretenberg/rollup_provider';
import { Field, Int, ObjectType } from 'type-graphql';
import { RollupDao } from '../entity/rollup';
import { TxType } from './tx_type';

@ObjectType()
export class RollupType {
  @Field(() => Int)
  id!: number;

  @Field({ nullable: true })
  proofData?: string;

  @Field()
  dataRoot!: string;

  @Field({ nullable: true })
  oldDataRoot?: string;

  @Field({ nullable: true })
  nullifierRoot?: string;

  @Field({ nullable: true })
  oldNullifierRoot?: string;

  @Field({ nullable: true })
  dataRootsRoot?: string;

  @Field({ nullable: true })
  oldDataRootsRoot?: string;

  @Field(() => Int)
  numTxs!: number;

  @Field(() => [TxType!])
  txs!: TxType[];

  @Field(() => Int, { nullable: true })
  ethBlock?: number;

  @Field({ nullable: true })
  ethTxHash?: string;

  @Field()
  status!: RollupStatus;

  @Field()
  created!: Date;
}

export const fromRollupDao = ({ id, dataRoot, proofData, ethBlock, ethTxHash, status, created }: RollupDao) => ({
  id,
  proofData: proofData ? proofData.toString('hex') : undefined,
  dataRoot: dataRoot.toString('hex'),
  ethBlock,
  ethTxHash: ethTxHash ? ethTxHash.toString('hex') : undefined,
  status,
  created,
});
