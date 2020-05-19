import { Connection, Repository } from 'typeorm';
import { Note } from '../entity/note';
import { BaseDb } from './Base';

export class NoteDb extends BaseDb {
  constructor(connection: Connection, note: Note) {
    super(connection, note);
  }

  public async addNote(inputNote: Note) {
    const writeNote: any = new Note();
    writeNote.id = inputNote.id;
    writeNote.owner = inputNote.owner;
    writeNote.viewingKey = inputNote.viewingKey;
    
    await super.rep.save(writeNote);
  }
}
