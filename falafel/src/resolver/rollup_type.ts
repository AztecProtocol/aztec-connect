import { RollupStatus } from 'barretenberg/rollup_provider';
import { Field, ObjectType } from 'type-graphql';
import { RollupDao } from '../entity/rollup';
import { TxType, toTxType } from './tx_type';

@ObjectType()
export class RollupType {
  @Field()
  id!: number;

  @Field()
  dataRoot!: string;

  @Field({ nullable: true })
  proofData?: string;

  @Field(() => [TxType!])
  txs!: TxType[];

  @Field({ nullable: true })
  ethBlock?: number;

  @Field({ nullable: true })
  ethTxHash?: string;

  @Field()
  status!: RollupStatus;

  @Field()
  created!: Date;
}

export const toRollupType = ({
  id,
  dataRoot,
  proofData,
  txs,
  ethBlock,
  ethTxHash,
  status,
  created,
}: RollupDao): RollupType => ({
  id,
  dataRoot: dataRoot.toString('hex'),
  proofData: proofData ? proofData.toString('hex') : undefined,
  txs: txs ? txs.map(toTxType) : [],
  ethBlock,
  ethTxHash: ethTxHash ? ethTxHash.toString('hex') : undefined,
  status,
  created,
});
