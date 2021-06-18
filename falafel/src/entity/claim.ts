import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'claim' })
export class ClaimDao {
  public constructor(init?: Partial<ClaimDao>) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public id!: number;

  @Column({ unique: true })
  public txId!: Buffer;

  @Column({ unique: true })
  @Index()
  public nullifier!: Buffer;

  @Column()
  public interactionNonce!: number;

  @Column()
  public created!: Date;

  @Column({ nullable: true })
  @Index()
  public claimed?: Date;
}
