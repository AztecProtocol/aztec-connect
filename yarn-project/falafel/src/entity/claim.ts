import { Column, Entity, Index, PrimaryColumn, AfterLoad } from 'typeorm';
import { bufferColumn } from './init_entities.js';
import { bigintTransformer } from './transformer.js';

@Entity({ name: 'claim' })
export class ClaimDao {
  public constructor(init?: Partial<ClaimDao>) {
    Object.assign(this, init);
  }

  @PrimaryColumn()
  public id!: number;

  // The nullifier of this claim's claim note.
  @Column(...bufferColumn({ length: 32, unique: true }))
  @Index()
  public nullifier!: Buffer;

  @Column('text', { transformer: [bigintTransformer] })
  public bridgeId!: bigint; // TODO: rename to bridgeCallData

  @Column('text', { transformer: [bigintTransformer] })
  public depositValue!: bigint;

  @Column(...bufferColumn())
  public partialState!: Buffer;

  @Column(...bufferColumn())
  public partialStateSecretEphPubKey!: Buffer;

  // The nullifier included in the preimage of this claim's partial claim note.
  // This is the nullifier of input note 1 of the defi deposit tx.
  @Column(...bufferColumn({ length: 32 }))
  public inputNullifier!: Buffer;

  @Column()
  // Should be indexed, leaving out for now to get timings.
  // @Index()
  public interactionNonce!: number;

  @Column('text', { transformer: [bigintTransformer] })
  public fee!: bigint;

  @Column()
  public created!: Date;

  @Column({ nullable: true })
  @Index()
  public claimed?: Date;

  @Column({ nullable: true })
  @Index()
  public interactionResultRollupId?: number;

  @AfterLoad()
  afterLoad() {
    if (this.interactionResultRollupId === null) {
      delete this.interactionResultRollupId;
    }
  }
}
