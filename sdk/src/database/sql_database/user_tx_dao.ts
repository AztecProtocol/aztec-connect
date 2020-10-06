import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { UserTx, UserTxAction } from '../../user_tx';
import { bigintTransformer } from './transformer';

@Entity({ name: 'userTx' })
@Index(['txHash', 'userId'], { unique: true })
export class UserTxDao implements UserTx {
  @PrimaryColumn()
  public txHash!: Buffer;

  @PrimaryColumn()
  public userId!: Buffer;

  @Column('varchar')
  public action!: UserTxAction;

  @Column()
  public assetId!: number;

  @Column('bigint', { transformer: [bigintTransformer] })
  public value!: bigint;

  @Column()
  public settled!: boolean;

  @Column()
  public created!: Date;

  @Column({ nullable: true })
  public recipient?: Buffer;
}
