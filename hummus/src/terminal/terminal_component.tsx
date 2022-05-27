import { useEffect } from 'react';
import React from 'react';
import { createGlobalStyle } from 'styled-components';
import { Terminal } from './terminal';
import { TerminalHandler } from './terminal_handler';
import { TerminalPage } from './terminal_page';

const GlobalStyle = createGlobalStyle`
  body {
    background-color: black;
  }
`;

export function TerminalComponent({ terminal }: { terminal: Terminal }) {
  useEffect(() => {
    const terminalHandler = new TerminalHandler(terminal);
    terminalHandler.start();
    return () => {
      terminalHandler.stop();
    };
  }, []);

  return (
    <React.Fragment>
      <GlobalStyle />
      <TerminalPage terminal={terminal} />
    </React.Fragment>
  );
}
