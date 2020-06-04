export class Cursor {
  private pos = 0;
  constructor(private chars: string, private delay: () => number) {}
  getChar() {
    return this.chars[this.pos % this.chars.length];
  }
  advance() {
    this.pos++;
  }
  getDelay() {
    return this.delay();
  }
}

export const blockCursor = () => new Cursor(`\u2588 `, () => 500);
export const spinnerCursor = () => new Cursor(`|/-\\`, () => 100 + 900 * Math.random());