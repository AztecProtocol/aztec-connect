import { useEffect } from 'react';
import React from 'react';
import { createGlobalStyle } from 'styled-components';
import { Terminal } from './terminal';
import { TerminalHandler } from './terminal_handler';
import { TerminalPage } from './terminal_page';
import { WebSdk } from '../web_sdk';

const GlobalStyle = createGlobalStyle`
  body {
    background-color: black;
  }
`;

export function TerminalComponent({ app, terminal }: { app: WebSdk; terminal: Terminal }) {
  useEffect(() => {
    const terminalHandler = new TerminalHandler(app, terminal);
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
