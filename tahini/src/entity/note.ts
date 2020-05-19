import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity({ name: 'Note' })
@Unique(["id"])
export class Note {
  @PrimaryColumn()
  public id!: string;

  @Column()
  public owner!: string;

  @Column()
  public viewingKey!: string;
}