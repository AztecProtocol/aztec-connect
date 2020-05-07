import { Text, Cursor } from './display';

export class UserInput {
  public historyRoot = '';
  public historyIdx = -1;

  constructor(private value: string = '', private cursorPosition: number = 0, private focused: boolean = false) {}

  getValue() {
    return this.value;
  }

  focus() {
    this.focused = true;
  }

  blur() {
    this.focused = false;
  }

  abortHistory() {
    this.historyRoot = '';
    this.historyIdx = -1;
  }

  moveCursor(offset: number) {
    const cursorPosition = this.cursorPosition + offset;
    if (cursorPosition < 0 || cursorPosition > this.value.length) {
      return false;
    }

    this.cursorPosition = cursorPosition;
    return true;
  }

  insert(text: string) {
    let value = this.value.slice(0, this.cursorPosition);
    value += text;
    value += this.value.slice(this.cursorPosition);
    this.value = value;
    this.cursorPosition += text.length;
    this.abortHistory();
  }

  deleteChar() {
    if (!this.cursorPosition) {
      return false;
    }

    this.value = `${this.value.slice(0, this.cursorPosition - 1)}${this.value.slice(this.cursorPosition)}`;
    this.cursorPosition--;
    this.abortHistory();
    return true;
  }

  deleteAll() {
    this.value = '';
    this.cursorPosition = 0;
    this.abortHistory();
  }

  replace(data: string) {
    this.value = data;
    this.cursorPosition = data.length;
  }

  getTextArray(): Text[] {
    if (!this.focused) {
      return [
        {
          text: `> ${this.value}`,
        },
      ];
    }

    let text;
    if (this.cursorPosition === this.value.length) {
      text = [
        {
          text: `> ${this.value}`,
        },
        Cursor,
      ];
    } else {
      const head = this.value.slice(0, this.cursorPosition);
      const tail = this.value.slice(this.cursorPosition + 1);
      text = [
        {
          text: `> ${head}`,
        },
        {
          text: this.value[this.cursorPosition],
          background: 'white',
          color: 'black',
          blink: true,
        },
      ];
      if (tail) {
        text.push({ text: tail });
      }
    }

    return [
      {
        text,
      },
    ];
  }
}
