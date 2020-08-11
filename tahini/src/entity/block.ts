import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'BlockDao' })
export class BlockDao {
  @PrimaryColumn()
  public id!: number;

  @Column()
  public created!: Date;

  @Column()
  public dataStartIndex!: number;

  @Column()
  public dataEntries!: Buffer;

  @Column()
  public nullifiers!: Buffer;
}
