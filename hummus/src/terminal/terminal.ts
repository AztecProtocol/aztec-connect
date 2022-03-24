import { EventEmitter } from 'events';
import { blockCursor, Cursor, spinnerCursor } from './cursor';

export enum EscapeChars {
  PAUSE = '\x01',
}

export class Terminal extends EventEmitter {
  private charBuf: Buffer;
  private cursorX = 0;
  private cursorY = 0;
  private cursor!: Cursor;
  private inputLocked = true;
  private stateCounter = 0;
  private interval!: NodeJS.Timeout;
  private cmd = '';

  constructor(private rows: number, private cols: number) {
    super();
    this.charBuf = Buffer.alloc(rows * cols, ' ', 'ascii');
    this.setCursor(blockCursor());
  }

  private setCursor(cursor: Cursor) {
    this.cursor = cursor;
    clearTimeout(this.interval);
    const f = () => {
      this.cursor.advance();
      this.updated();
      this.interval = setTimeout(f, this.cursor.getDelay());
    };
    this.interval = setTimeout(f, this.cursor.getDelay());
  }

  stop() {
    clearTimeout(this.interval);
  }

  charAt(x: number, y: number) {
    return String.fromCharCode(this.charBuf[y * this.cols + x]);
  }

  putChar(x: number, y: number, char: string) {
    this.charBuf[y * this.cols + x] = char.charCodeAt(0);
  }

  putCursorChar(char: string) {
    this.putChar(this.cursorX, this.cursorY, char);
    this.cursorX++;
    if (this.cursorX >= this.cols) {
      this.newLine();
    }
  }

  private clearLine() {
    this.cursorX = 0;
    this.charBuf.fill(' ', this.cols * this.cursorY);
  }

  public isPrompting() {
    return !this.inputLocked;
  }

  public async prompt() {
    this.setCursor(blockCursor());
    await this.putString('> ' + this.cmd);
    this.inputLocked = false;
  }

  public async lock() {
    this.setCursor(spinnerCursor());
    this.inputLocked = true;
  }

  private updated() {
    this.emit('updated', ++this.stateCounter);
  }

  async pasteString(str: string) {
    if (this.inputLocked) {
      return;
    }
    this.cmd += str;
    await this.putString(str);
  }

  async putString(str: string) {
    const savedInputLocked = this.inputLocked;
    const savedCursor = this.cursor;
    this.inputLocked = true;
    for (const char of str.toUpperCase()) {
      switch (char) {
        case EscapeChars.PAUSE:
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
      }

      // Reset blink.
      this.setCursor(blockCursor());

      switch (char) {
        case '\n':
          this.newLine();
          break;
        case '\r':
          this.clearLine();
          break;
        default:
          this.putCursorChar(char);
      }
      this.updated();
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    this.setCursor(savedCursor);
    this.inputLocked = savedInputLocked;
    this.updated();
  }

  private newLine() {
    this.cursorX = 0;
    if (this.cursorY === this.rows - 1) {
      this.charBuf.copyWithin(0, this.cols);
      this.charBuf.fill(' ', (this.rows - 1) * this.cols);
    } else {
      this.cursorY++;
    }
  }

  private backspace() {
    if (this.cursorX > 0) {
      this.putChar(this.cursorX - 1, this.cursorY, ' ');
      this.cursorX--;
    } else {
      this.putChar(this.getCols() - 1, this.cursorY - 1, ' ');
      this.cursorX = this.getCols() - 1;
      this.cursorY--;
    }
  }

  keyDown(event: KeyboardEvent) {
    if (this.inputLocked || event.metaKey) {
      return;
    }

    if (event.ctrlKey) {
      if (event.key.toLowerCase() === 'c') {
        this.cmd = '';
        this.newLine();
        this.prompt();
        this.updated();
      }
      return;
    }

    if (this.printable(event.keyCode)) {
      event.preventDefault();

      // Reset blink.
      this.setCursor(blockCursor());

      this.putCursorChar(event.key.toUpperCase());
      this.cmd += event.key.toUpperCase();
    } else {
      switch (event.keyCode) {
        case 8:
          // Reset blink.
          this.setCursor(blockCursor());
          if (!this.cmd.length) {
            break;
          }
          this.backspace();
          this.cmd = this.cmd.slice(0, -1);
          break;
        case 13: {
          const cmd = this.cmd;
          this.cmd = '';
          this.newLine();
          this.lock();
          this.emit('cmd', cmd);
          break;
        }
        default:
          return;
      }
    }

    this.updated();
  }

  asString(includeCursor = true) {
    let data = '';
    for (let i = 0; i < this.rows; ++i) {
      const row = this.charBuf.slice(i * this.cols, i * this.cols + this.cols).toString('ascii');
      if (i === this.cursorY && includeCursor) {
        data += row.slice(0, this.cursorX) + this.cursor.getChar() + row.slice(this.cursorX + 1) + '\n';
      } else {
        data += row + '\n';
      }
    }
    return data;
  }

  getRows() {
    return this.rows;
  }

  getCols() {
    return this.cols;
  }

  private printable(keycode: number) {
    return (
      (keycode > 47 && keycode < 58) || // number keys
      keycode === 32 || // space
      (keycode > 64 && keycode < 91) || // letter keys
      (keycode > 95 && keycode < 112) || // numpad keys
      (keycode > 185 && keycode < 193) || // ;=,-./` (in order)
      (keycode > 218 && keycode < 223) // [\]' (in order)
    );
  }
}
