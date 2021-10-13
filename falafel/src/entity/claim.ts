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
  public nullifier!: Buffer; // the nullifier of this claim's claim note

  @Column('text', { transformer: [bigintTransformer] })
  public bridgeId!: bigint;

  @Column('text', { transformer: [bigintTransformer] })
  public depositValue!: bigint;

  @Column()
  public partialState!: Buffer;

  @Column()
  public partialStateSecretEphPubKey!: Buffer;

  @Column()
  public inputNullifier!: Buffer; // the nullifier included in the preimage of this claim's partial claim note. (This is the nullifier of input note 1 of the defi deposit tx).

  @Column()
  public interactionNonce!: number;

  @Column('text', { transformer: [bigintTransformer] })
  public fee!: bigint;

  @Column()
  public created!: Date;

  @Column({ nullable: true })
  @Index()
  public claimed?: Date;
}
