import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'key' })
export class KeyDao {
  @PrimaryColumn()
  public name!: string;

  @Column()
  public value!: Buffer;
}
