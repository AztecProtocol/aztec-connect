import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'block' })
export class BlockDao {
  @PrimaryColumn()
  public id!: number;

  @Index({ unique: true })
  @Column()
  public txHash!: Buffer;

  @Column()
  public created!: Date;

  @Index({ unique: true })
  @Column()
  public rollupId!: number;

  @Column()
  public rollupSize!: number;

  @Column()
  public rollupProofData!: Buffer;

  @Column()
  public viewingKeysData!: Buffer;
}
