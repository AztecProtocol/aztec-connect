import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Switch, Route, Link } from 'react-router-dom';
import { History } from 'history';
import { FlexBox, Block, SwitchInput, TextButton, Icon } from '@aztec/guacamole-ui';
import { App } from './app';
import { JoinSplitForm } from './join_split_form';
import { ThemeContext, themes } from './config/context';
import { Terminal2020 } from './terminal2020';
import styles from './index.scss';
import './styles/guacamole.css';
import debug from 'debug';
import { Terminal, TerminalComponent } from './terminal';
require('barretenberg-es/wasm/barretenberg.wasm');

function ThemedForm({ app }: { app: App }) {
  const [theme, setTheme] = useState(themes.darkTheme);

  return (
    <ThemeContext.Provider value={theme}>
      <Block className={styles.container} padding="xl" align="center" background={theme.background} stretch>
        <FlexBox align="center">
          <div className={styles.content}>
            <JoinSplitForm app={app} theme={theme} />
            <Block top="xl">
              <FlexBox valign="center" align="space-between">
                <TextButton theme="implicit" color={theme.link} href="/terminal" Link={Link}>
                  <FlexBox valign="center">
                    <Block right="xs">Terminal Mode</Block>
                    <Icon name="chevron_right" color={theme.link} />
                  </FlexBox>
                </TextButton>
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

function LandingPage({ app }: { app: App }) {
  return (
    <Switch>
      <Route
        exact
        path="/terminal-2020"
        component={({ history }: { history: History }) => <Terminal2020 app={app} onExit={() => history.push('/')} />}
      />
      <Route
        path="/terminal"
        component={({ history }: { history: History }) => <TerminalComponent app={app} terminal={new Terminal(12, 40)} onExit={() => history.push('/')} />}
      />
      <Route>
        <ThemedForm app={app} />
      </Route>
    </Switch>
  );
}

async function main() {
  debug.enable('bb:*');
  const app = new App();
  ReactDOM.render(
    <BrowserRouter>
      <LandingPage app={app} />
    </BrowserRouter>,
    document.getElementById('root'),
  );
}

// tslint:disable-next-line:no-console
main().catch(console.error);
