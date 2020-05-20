import { Connection, Repository } from 'typeorm';
import { Notes } from '../entity/Notes';
import { BaseDb } from './Base';
import { write } from 'fs';

export class NotesDb extends BaseDb {
  constructor(connection: Connection, note: Notes) {
    super(connection, note);
  }

  public async addNote(inputNotes: Notes) {
    const writeNotes: any = new Notes();
    writeNotes.id = inputNotes.id
    writeNotes.notes = inputNotes.notes;    
    await super.rep.save(writeNotes);
  }
}
