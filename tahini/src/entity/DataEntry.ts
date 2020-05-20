import { Column, Entity, PrimaryColumn, Unique, OneToMany } from 'typeorm';
import { Note } from './Note';

@Entity({ name: 'DataEntry' })
@Unique(['id'])
export class DataEntry {
  @PrimaryColumn()
  public id!: string;

  @OneToMany(type => Note, note => note.entryId, { cascade: true })
  public notes!: Note[];
}
