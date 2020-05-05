import styled, { keyframes } from 'styled-components';
import React, { useState, useEffect } from 'react';
import { EventEmitter } from 'events';

const glitch = keyframes`
  30% {  }
  40% { opacity:1; top:0; left:0;  -webkit-transform:scale(1,1);  -webkit-transform:skew(0,0);}
  41% { opacity:0.8; top:0px; left:-100px; -webkit-transform:scale(1,1.2);  -webkit-transform:skew(50deg,0);}
  42% { opacity:0.8; top:0px; left:100px; -webkit-transform:scale(1,1.2);  -webkit-transform:skew(-80deg,0);}
  43% { opacity:1; top:0; left:0; -webkit-transform:scale(1,1);  -webkit-transform:skew(0,0);}
  65% { }
`;

const blur = keyframes`
  0%   { -webkit-filter: blur(1px); opacity:0.9;}
  50% { -webkit-filter: blur(1px); opacity:1; }
  100%{ -webkit-filter: blur(1px); opacity:0.9; }
`;

const jerk = keyframes`
  50% { padding-left:1px; }
  51% { padding-left:0; }
`;

const GlitchWrapper = styled.div`
  position: relative;
  margin: 50px auto;
  background-color: #000;
  overflow: hidden;
  padding: 30px;
  /* animation: ${glitch} 5s infinite; */
`;

const StyledTerminal = styled.div`
  font-family: 'Courier new';
  background-color: black;
  color: rgba(255, 255, 255, 0.8);
  font-size: 60px;
  font-weight: bold;
  font-style: normal;
  white-space: pre;
  filter: blur(1px);
  text-align: center;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.4);
  animation: ${blur} 32ms infinite, ${jerk} 50ms infinite;
`;

class Cursor {
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

const blockCursor = () => new Cursor(`\u2588 `, () => 500);
const spinnerCursor = () => new Cursor(`|/-\\`, () => 100 + 900 * Math.random());

export class Terminal extends EventEmitter {
  private charBuf: Buffer;
  private cursorX = 0;
  private cursorY = 0;
  private cursor!: Cursor;
  private inputLocked = false;
  private stateCounter = 0;
  private interval!: number;
  private cmd: string = '';

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

  private lockInput() {
    this.inputLocked = true;
  }

  public isPrompting() {
    return !this.inputLocked;
  }

  public async prompt() {
    this.setCursor(blockCursor());
    await this.putString('> ' + this.cmd);
    this.inputLocked = false;
  }

  private updated() {
    this.emit('updated', ++this.stateCounter);
  }

  async putString(str: string) {
    const savedCursor = this.cursor;
    for (const char of str.toUpperCase()) {
      // Reset blink.
      this.setCursor(blockCursor());

      switch (char) {
        case '\n':
          this.newLine();
          break;
        case '\r':
          this.clearLine();
          break;
        case '\x01':
          await new Promise(resolve => setTimeout(resolve, 500));
          break;
        default:
          this.putCursorChar(char);
      }
      this.updated();
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    this.setCursor(savedCursor);
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
    }
  }

  keyDown(event: KeyboardEvent) {
    if (this.inputLocked) {
      return;
    }

    if (this.printable(event.keyCode)) {
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
        case 13:
          const cmd = this.cmd;
          this.cmd = '';
          this.newLine();
          this.lockInput();
          this.setCursor(spinnerCursor());
          this.emit('cmd', cmd);
          break;
        default:
          return;
      }
    }

    this.updated();
  }

  asString() {
    let data = '';
    for (let i = 0; i < this.rows; ++i) {
      const row = this.charBuf.slice(i * this.cols, i * this.cols + this.cols).toString('ascii');
      if (i === this.cursorY) {
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

const Scanline = styled.div`
  width: 100%;
  display: block;
  background: #000;
  height: 4px;
  position: relative;
  z-index: 3;
  margin-bottom: 5px;
  opacity: 0.1;
`;

interface TerminalProps {
  terminal: Terminal;
}

const ScanlineContainer = styled.div`
  position: absolute;
  top: 0px;
  width: 100%;
  padding-top: 30px;
`;

export function TerminalPage({ terminal }: TerminalProps) {
  const [, setCount] = useState(0);
  useEffect(() => {
    const eventListener = (e: KeyboardEvent) => {
      terminal.keyDown(e);
    };
    terminal.on('updated', setCount);
    window.addEventListener('keydown', eventListener);
    return () => {
      terminal.removeListener('updates', setCount);
      window.removeEventListener('keydown', eventListener);
    };
  }, [terminal]);

  return (
    <GlitchWrapper>
      <StyledTerminal>{terminal.asString()}</StyledTerminal>
      <ScanlineContainer>
        {Array(8 * terminal.getRows())
          .fill(0)
          .map((_, i) => (
            <Scanline key={i}></Scanline>
          ))}
      </ScanlineContainer>
    </GlitchWrapper>
  );
}
