import React from 'react';
import ReactDOM from 'react-dom';
import { GlobalStyle } from './global_style';
import { NetworkRouter } from './network_router';

ReactDOM.render(
  <>
    <GlobalStyle />
    <NetworkRouter />
  </>,
  document.getElementById('root'),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();
