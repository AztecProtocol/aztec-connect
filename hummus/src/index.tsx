import React from 'react';
import ReactDOM from 'react-dom';
import { Block } from '@aztec/guacamole-ui';
import JoinSplitProof from './join_split_proof';
import JoinSplitForm from './join_split_form';

import './styles/guacamole.css';
require('barretenberg-es/wasm/barretenberg.wasm');

interface LandingPageProps {
  joinSplit: JoinSplitProof;
}

function LandingPage({ joinSplit }: LandingPageProps) {
  return (
    <Block
      padding="xl"
      align="center"
    >
      <JoinSplitForm joinSplit={joinSplit} />
    </Block>
  );
}

async function main() {
  const joinSplit = new JoinSplitProof();
  ReactDOM.render(<LandingPage joinSplit={joinSplit} />, document.getElementById('root'));
}

// tslint:disable-next-line:no-console
main().catch(console.error);
