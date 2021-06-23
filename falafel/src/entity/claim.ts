import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { bigintTransformer } from './transformer';

@Entity({ name: 'claim' })
export class ClaimDao {
  public constructor(init?: Partial<ClaimDao>) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public id!: number;

  @Column({ unique: true })
  @Index()
  public nullifier!: Buffer;

  @Column('text', { transformer: [bigintTransformer] })
  public bridgeId!: bigint;

  @Column('text', { transformer: [bigintTransformer] })
  public depositValue!: bigint;

  @Column()
  public partialState!: Buffer;

  @Column()
  public interactionNonce!: number;

  @Column()
  public created!: Date;

  @Column({ nullable: true })
  @Index()
  public claimed?: Date;
}
