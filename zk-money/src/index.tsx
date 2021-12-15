import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { getConfig } from './config';
import { GlobalStyle } from './global_style';
import { Views } from './views';

declare global {
  interface Window {
    ethereum: any;
  }
}

async function main() {
  const config = await getConfig();

  ReactDOM.render(
    <>
      <GlobalStyle />
      <BrowserRouter>
        <Views config={config} />
      </BrowserRouter>
    </>,
    document.getElementById('root'),
  );
}

main().catch(console.log);
