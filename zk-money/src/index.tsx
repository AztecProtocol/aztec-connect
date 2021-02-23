import ApolloClient from 'apollo-boost';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
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

const client = new ApolloClient({ uri: config.graphqlEndpoint });

ReactDOM.render(
  <>
    <GlobalStyle />
    <ApolloProvider client={client}>
      <BrowserRouter>
        <Views config={config} />
      </BrowserRouter>
    </ApolloProvider>
  </>,
  document.getElementById('root'),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();
