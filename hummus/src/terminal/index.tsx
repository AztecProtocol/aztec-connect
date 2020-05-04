import styled from 'styled-components';
import React, { useState, useEffect } from 'react';

const StyledTerminal = styled.div`
  font-family: 'Courier new';
  background-color: black;
  color: white;
  font-size: 80px;
  font-weight: bold;
  font-style: normal;
  white-space: pre;
  -webkit-filter: blur(1px);
`;

export class Terminal {
  private charBuf: Buffer;
  private cursorX = 0;
  private cursorY = 0;

  constructor(private rows: number, private cols: number) {
    this.charBuf = Buffer.alloc(rows * cols, ' ', 'ascii');
  }

  charAt(x: number, y: number) {
    return String.fromCharCode(this.charBuf[y * this.cols + x]);
  }

  putChar(x: number, y: number, char: string) {
    this.charBuf[y * this.cols + x] = char.charCodeAt(0);
  }

  keyDown(event: KeyboardEvent) {
    console.log(event);
    if (this.printable(event.keyCode)) {
      this.putChar(this.cursorX, this.cursorY, event.key.toUpperCase());
      this.cursorX++;
      if (this.cursorX >= this.cols) {
        this.cursorX = 0;
        this.cursorY++;
      }
      return;
    }

    switch (event.keyCode) {
      case 8: {
        // Backspace
        if (this.cursorX > 0) {
          this.putChar(this.cursorX - 1, this.cursorY, ' ');
          this.cursorX--;
        }
        break;
      }
      case 13: {
        // Enter
        this.cursorX = 0;
        this.cursorY = (this.cursorY + 1) % this.rows;
        break;
      }
    }
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

interface TerminalProps {
  terminal: Terminal;
}

export function TerminalPage({ terminal }: TerminalProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const eventListener = (e: KeyboardEvent) => {
      terminal.keyDown(e);
      setCount(count + 1);
    };
    window.addEventListener('keydown', eventListener);
    return () => {
      window.removeEventListener('keydown', eventListener);
    };
  });

  return (
    <StyledTerminal className="buzz_wrapper">
      {Array(terminal.getRows())
        .fill(0)
        .map((_, y) => (
          <div key={y}>
            {Array(terminal.getCols())
              .fill(0)
              .map((_, x) => (
                <span key={x}>{terminal.charAt(x, y)}</span>
              ))}
          </div>
        ))}
    </StyledTerminal>
  );
}
