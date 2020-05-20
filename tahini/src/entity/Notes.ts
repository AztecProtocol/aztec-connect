import { Column, Entity, PrimaryColumn, Unique, OneToMany, JoinColumn, ManyToOne } from 'typeorm';
import { Note } from './Note';

@Entity({ name: 'Notes' })
@Unique(['id'])
export class Notes {
  @PrimaryColumn()
  public id!: string;

  @OneToMany(type => Note, note => note.entryId, { cascade: true })
  public notes!: Note[];
}
