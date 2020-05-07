import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { FlexBox, Block } from '@aztec/guacamole-ui';
import { App } from './app';
import { JoinSplitForm } from './join_split_form';
import './styles/guacamole.css';
import debug from 'debug';
import { Terminal, TerminalComponent } from './terminal';
require('barretenberg-es/wasm/barretenberg.wasm');

function LandingPage({ app }: { app: App }) {
  const [ termMode, setTermMode ] = useState(true);

  return termMode ? (
    <TerminalComponent app={app} terminal={new Terminal(12, 40)} onExit={() => setTermMode(false)}/>
  ) : (
    <Block padding="xl" align="center">
      <FlexBox align="center">
        <JoinSplitForm app={app} />
      </FlexBox>
    </Block>
  );
}
async function main() {
  debug.enable('bb:*');
  const app = new App();
  ReactDOM.render(<LandingPage app={app}/>, document.getElementById('root'));
}

// tslint:disable-next-line:no-console
main().catch(console.error);
