import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { FlexBox, Block, SwitchInput } from '@aztec/guacamole-ui';
import { App } from './app';
import { JoinSplitForm } from './join_split_form';
import { ThemeContext, themes } from './config/context';
import styles from './index.scss';
import './styles/guacamole.css';
import debug from 'debug';
import { Terminal, TerminalComponent } from './terminal';
require('barretenberg-es/wasm/barretenberg.wasm');

function LandingPage({ app }: { app: App }) {
  const [theme, setTheme] = useState(themes.terminal);

  if (theme.theme === 'terminal1970') {
    return (<TerminalComponent app={app} terminal={new Terminal(12, 40)} onExit={() => setTheme(themes.darkTheme)}/>);
  }

  return (
    <ThemeContext.Provider value={theme}>
      <Block
        className={styles.container}
        padding="xl"
        align="center"
        background={theme.background}
        stretch
      >
        <FlexBox align="center">
            <div className={styles.content}>
              <JoinSplitForm app={app} theme={theme} />
              <Block top="xl">
                <FlexBox valign="center" align="space-between">
                  <SwitchInput
                    theme={theme.theme}
                    onClick={() => setTheme(theme.theme === 'light' ? themes.darkTheme : themes.lightTheme)}
                    checked={theme.theme === 'light'}
                  />
                </FlexBox>
              </Block>
            </div>
          </FlexBox>
      </Block>
    </ThemeContext.Provider>
  );
}
async function main() {
  debug.enable('bb:*');
  const app = new App();
  ReactDOM.render(<LandingPage app={app}/>, document.getElementById('root'));
}

// tslint:disable-next-line:no-console
main().catch(console.error);
