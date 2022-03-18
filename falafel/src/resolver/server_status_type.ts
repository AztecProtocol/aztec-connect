import { Field, Int, ObjectType } from 'type-graphql';
import { HexString, ISODateTime } from './scalar_type';

@ObjectType()
export class ServerStatusType {
  @Field(() => Int)
  chainId!: number;

  @Field()
  rollupContractAddress!: string;

  @Field(() => Int)
  dataSize!: number;

  @Field(() => HexString)
  dataRoot!: string;

  @Field(() => HexString)
  nullRoot!: string;

  @Field(() => HexString)
  rootRoot!: string;

  @Field(() => ISODateTime, { nullable: true })
  nextPublishTime?: Date;

  @Field(() => Int, { nullable: true })
  pendingTxCount?: number;
}
