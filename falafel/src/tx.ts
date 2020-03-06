import { Point } from "./point";
import { Note } from "./note";
import { Signature } from "./signature";

export class Tx {
  constructor(
    public owner: Point,
    public public_input: number,
    public public_output: number,
    public num_input_notes: number,
    public input_note_index: number[],
    public input_notes: Note[],
    public output_notes: Note[],
    public signature: Signature
  ) {}

  static fromJSON(json: any) {
    return new Tx(
      Point.fromJSON(json.owner),
      json.public_input,
      json.public_output,
      json.num_input_notes,
      json.input_note_index,
      json.input_notes.map(Note.fromJSON),
      json.output_notes.map(Note.fromJSON),
      Signature.fromJSON(json.signature)
    );
  }

  toBuffer() {
    let num_buffer = Buffer.alloc(20);
    num_buffer.writeUInt32BE(this.public_input, 0);
    num_buffer.writeUInt32BE(this.public_output, 4);
    num_buffer.writeUInt32BE(this.num_input_notes, 8);
    num_buffer.writeUInt32BE(this.input_note_index[0], 12);
    num_buffer.writeUInt32BE(this.input_note_index[1], 16);
    return Buffer.concat([
      this.owner.toBuffer(),
      num_buffer,
      this.input_notes[0].toBuffer(),
      this.input_notes[1].toBuffer(),
      this.output_notes[0].toBuffer(),
      this.output_notes[1].toBuffer(),
      this.signature.toBuffer(),
    ]);
  }
}
