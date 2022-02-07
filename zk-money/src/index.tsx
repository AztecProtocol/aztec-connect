import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import 'ui-components/styles/reset.css';
import 'ui-components/styles/global.css';
import { getConfig } from './config';
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
      <BrowserRouter>
        <Views config={config} />
      </BrowserRouter>
    </>,
    document.getElementById('root'),
  );
}

main().catch(console.log);
