import { WebSdk } from '@aztec/sdk';
import debug from 'debug';
import React from 'react';
import ReactDOM from 'react-dom';
import { createGlobalStyle } from 'styled-components';
import { minDemo } from './min_demo';
import { Terminal, TerminalComponent } from './terminal';

declare global {
  interface Window {
    web3: any;
    ethereum: any;
  }
}

const GlobalStyle = createGlobalStyle`
  #root {
    height: 100vh;
    overflow: hidden;
  }
`;

async function main() {
  if (!debug.enabled('bb:') && process.env.NODE_ENV !== 'production') {
    debug.enable('bb:*');
    location.reload();
  }

  if (window.location.pathname === '/min-demo') {
    await minDemo();
  } else {
    const app = new WebSdk(window.ethereum);
    ReactDOM.render(
      <>
        <GlobalStyle />
        <TerminalComponent app={app} terminal={new Terminal(12, 40)} />
      </>,
      document.getElementById('root'),
    );
  }
}

// tslint:disable-next-line:no-console
main().catch(console.error);
