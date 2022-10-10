export interface NoteDecryptor {
  batchDecryptNotes(keysBuf: Buffer, privateKey: Buffer): Promise<Buffer>;
}
