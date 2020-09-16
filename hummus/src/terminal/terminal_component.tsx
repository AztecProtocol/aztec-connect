import { WebSdk } from 'aztec2-sdk';
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

export function TerminalComponent({ app, terminal, onExit }: { app: WebSdk; terminal: Terminal; onExit: () => void }) {
  useEffect(() => {
    const terminalHandler = new TerminalHandler(app, terminal, onExit);
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
