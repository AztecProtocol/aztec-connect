import { JsonRpcProvider, WalletProvider } from '@aztec/sdk';
import { enableLogs, isEnabled } from '@aztec/barretenberg/log';
import React from 'react';
import ReactDOM from 'react-dom';
import { createGlobalStyle } from 'styled-components';
import { minDemo } from './min_demo';
import { Terminal } from './terminal';
import { TerminalComponent } from './terminal/terminal_component';
import { TerminalHandler } from './terminal/terminal_handler';

declare global {
  interface Window {
    web3: any;
    ethereum: any;
    aztecSdk: any;
    terminalPrompting: any;
    injectProvider: (host: string, pk: string) => void;
  }
}

const GlobalStyle = createGlobalStyle`
  #root {
    height: 100vh;
    overflow: hidden;
  }
`;

async function getDeployTag() {
  // If we haven't overridden our deploy tag, we discover it at runtime. All s3 deployments have a file
  // called DEPLOY_TAG in their root containing the deploy tag.
  if (process.env.NODE_ENV === 'production') {
    return await fetch('/DEPLOY_TAG').then(resp => (resp.ok ? resp.text() : ''));
  } else {
    return '';
  }
}

async function main() {
  if (!isEnabled('bb:') && process.env.NODE_ENV !== 'production') {
    enableLogs('bb:*');
    location.reload();
  }

  if (window.location.pathname === '/min-demo') {
    minDemo();
  } else {
    const terminal = new Terminal(12, 40, true);
    // Expose await terminal prompting, for use in tests.
    window.terminalPrompting = () => terminal.awaitPrompting();

    const debug = window.localStorage.getItem('debug') || 'bb:*';
    const deployTag = await getDeployTag();
    const serverUrl = deployTag ? `https://${deployTag}-sdk.aztec.network/` : 'http://localhost:1234';

    const terminalHandler = new TerminalHandler(terminal, window.ethereum, { debug, serverUrl });
    terminalHandler.start();

    // Allows injecting a provider externally (e.g. from puppeteer).
    window.injectProvider = (host: string, privateKeyStr: string) => {
      const provider = new WalletProvider(new JsonRpcProvider(host));
      provider.addAccount(Buffer.from(privateKeyStr, 'hex'));
      terminalHandler.provider = provider;
    };

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
main().catch(console.log);
