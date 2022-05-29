import { JsonRpcProvider, WalletProvider } from '@aztec/sdk';
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
    aztecSdk: any;
    terminalPrompting: any;
    injectProvider: (host: string) => void;
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

  // Allows injecting a provider externally (e.g. from puppeteer).
  window.injectProvider = (host: string) => (window.ethereum = new WalletProvider(new JsonRpcProvider(host)));

  if (window.location.pathname === '/min-demo') {
    await minDemo();
  } else {
    const terminal = new Terminal(12, 40);
    // Expose terminal prompting, for use in tests.
    window.terminalPrompting = () => terminal.isPrompting();

    ReactDOM.render(
      <>
        <GlobalStyle />
        <TerminalComponent terminal={terminal} />
      </>,
      document.getElementById('root'),
    );
  }
}

// tslint:disable-next-line:no-console
main().catch(console.error);
