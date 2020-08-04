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

  @Column()
  public rollupId!: number;

  @Column()
  public dataRoot!: Buffer;

  @Column()
  public nullRoot!: Buffer;

  @Column()
  public dataStartIndex!: number;

  @Column()
  public numDataEntries!: number;

  @Column()
  public dataEntries!: Buffer;

  @Column()
  public nullifiers!: Buffer;

  @Column()
  public viewingKeys!: Buffer;
}
