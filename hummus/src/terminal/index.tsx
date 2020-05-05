import styled, { keyframes } from 'styled-components';
import React, { useState, useEffect } from 'react';
import { EventEmitter } from 'events';

const glitch = keyframes`
  30% {  }
  95% { opacity:1; left:0;  -webkit-transform:scale(1,1);  -webkit-transform:skew(0,0);}
  96% { opacity:0.8; left:-100px; -webkit-transform:scale(1,1.2);  -webkit-transform:skew(50deg,0);}
  97% { opacity:0.8; left:100px; -webkit-transform:scale(1,1.2);  -webkit-transform:skew(-80deg,0);}
  98% { opacity:1; left:0; -webkit-transform:scale(0,0);  -webkit-transform:skew(0,0);}
  100% { opacity:0; }
`;

const flicker = keyframes`
  0%   {  opacity:0.9;}
  50% {  opacity:1; }
  100%{ opacity:0.9; }
`;

const jerk = keyframes`
  50% { padding-left:1px; }
  51% { padding-left:0; }
`;

const Display = styled.div`
  position: relative;
  margin: 50px auto;
  background-color: #000;
  overflow: hidden;
  padding: 30px;
  animation: ${flicker} 32ms infinite;
`;

const Logo = styled.div`
  position: absolute;
  margin: auto auto;
  fill: rgba(255, 255, 255, 0.8);
  filter: blur(3px);
  width: 400px;
  left: 0;
  right: 0;
  animation: ${jerk} 50ms infinite, ${glitch} 2s 1;
  animation-fill-mode: forwards;
`;

const StyledTerminal = styled.div`
  font-family: 'Courier new';
  color: rgba(255, 255, 255, 0.8);
  font-size: 60px;
  font-weight: bold;
  font-style: normal;
  white-space: pre;
  filter: blur(1px);
  text-align: center;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.4);
  animation: ${jerk} 50ms infinite;
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
  private inputLocked = true;
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
          this.inputLocked = true;
          this.newLine();
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
    <Display onPaste={async e => terminal.pasteString(e.clipboardData.getData('text'))}>
      <Logo>
        <svg viewBox="500 80 135 138">
          <g>
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M 573.12 83.536 L 632.518 142.933 C 635.642 146.057 635.642 151.123 632.518 154.247 L 573.12 213.643 C 569.996 216.768 564.931 216.768 561.807 213.643 L 502.41 154.247 C 499.286 151.123 499.286 146.057 502.41 142.933 L 561.807 83.536 C 564.931 80.412 569.996 80.412 573.12 83.536 Z M 573.12 104.749 C 569.996 101.625 564.931 101.625 561.807 104.749 L 523.623 142.933 C 520.499 146.057 520.499 151.123 523.623 154.247 L 561.807 192.43 C 564.931 195.554 569.996 195.554 573.12 192.43 L 611.304 154.247 C 614.428 151.123 614.428 146.057 611.304 142.933 L 573.12 104.749 Z"
            ></path>
            <path
              opacity="1"
              d="M 590.091 142.933 L 573.12 125.963 C 569.996 122.838 564.931 122.838 561.807 125.963 L 544.836 142.933 C 541.712 146.057 541.712 151.123 544.836 154.247 L 561.807 171.217 C 564.931 174.342 569.996 174.342 573.12 171.217 L 590.091 154.247 C 593.215 151.123 593.215 146.057 590.091 142.933 Z"
            ></path>
          </g>
        </svg>
      </Logo>
      <StyledTerminal>{terminal.asString()}</StyledTerminal>
      <ScanlineContainer>
        {Array(8 * terminal.getRows())
          .fill(0)
          .map((_, i) => (
            <Scanline key={i}></Scanline>
          ))}
      </ScanlineContainer>
    </Display>
  );
}
