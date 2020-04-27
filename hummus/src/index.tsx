import React from 'react';
import ReactDOM from 'react-dom';
import { Block } from '@aztec/guacamole-ui';
import { App } from './app';
import JoinSplitForm from './join_split_form';

import './styles/guacamole.css';
require('barretenberg-es/wasm/barretenberg.wasm');

interface LandingPageProps {
  app: App;
}

function LandingPage({ app }: LandingPageProps) {
  return (
    <Block
      padding="xl"
      align="center"
    >
      <JoinSplitForm app={app} />
    </Block>
  );
}

async function main() {
  const app = new App();
  ReactDOM.render(<LandingPage app={app} />, document.getElementById('root'));
}

// tslint:disable-next-line:no-console
main().catch(console.error);
