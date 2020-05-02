import React from 'react';
import ReactDOM from 'react-dom';
import { FlexBox, Block } from '@aztec/guacamole-ui';
import { App } from './app';
import JoinSplitForm from './join_split_form';
import { User } from './user';
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
      <FlexBox align="center">
        <JoinSplitForm app={app} />
      </FlexBox>
    </Block>
  );
}

async function main() {
  const app = new App();
  ReactDOM.render(<LandingPage app={app}/>, document.getElementById('root'));
}

// tslint:disable-next-line:no-console
main().catch(console.error);
