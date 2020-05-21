import { Connection, Repository } from 'typeorm';
import { Note } from '../entity/note';

export class NoteDb {
  private noteRep!: Repository<Note>;

  constructor(private connection: Connection, ) {}

  public async init() {
    this.noteRep = this.connection.getRepository(Note);
  }

  public async saveNotes(notes: Note[]) {
    await this.noteRep.save(notes);
  }
}
