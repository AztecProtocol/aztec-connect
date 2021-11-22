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

const config = getConfig();

ReactDOM.render(
  <>
    <GlobalStyle />
    <BrowserRouter>
      <Views config={config} />
    </BrowserRouter>
  </>,
  document.getElementById('root'),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();
