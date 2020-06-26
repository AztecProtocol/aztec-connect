import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Switch, Route, Link, useLocation, RouteComponentProps } from 'react-router-dom';
import { History } from 'history';
import styled, { createGlobalStyle } from 'styled-components';
import { FlexBox, Block, SwitchInput, TextButton, Icon, PageSteps } from '@aztec/guacamole-ui';
import { App } from './app';
import { JoinSplitForm } from './join_split_form';
import { LocalState, GlobalState, RollupDetails, TxDetails } from './data_explorer';
import { ThemeContext, themes } from './config/context';
import { Terminal2020 } from './terminal2020';
import './styles/guacamole.css';
import debug from 'debug';
import { Terminal, TerminalComponent } from './terminal';
require('barretenberg/wasm/barretenberg.wasm');

const GlobalStyle = createGlobalStyle`
  #root {
    height: 100vh;
    overflow: hidden;
  }
`;

const Container = ({
  className,
  background,
  children,
}: {
  className?: string;
  background: string;
  children: React.ReactNode;
}) => (
  <Block className={className} padding="xl" align="center" background={background} stretch>
    {children}
  </Block>
);

const StyledContainer = styled(Container)`
  height: 100vh;
  overflow: auto;
`;

const StyledContent = styled.div`
  width: 100%;
  max-width: 640px;
`;

const tabs = [
  { title: 'Send', href: '/' },
  { title: 'Transactions', href: '/transactions' },
  { title: 'Explorer', href: '/explorer' },
];

interface RollupRouteParams {
  id: string;
}

interface RollupRouteProps extends RouteComponentProps<RollupRouteParams> {}

interface TxRouteParams {
  txHash: string;
}

interface TxRouteProps extends RouteComponentProps<TxRouteParams> {}

function ThemedContent({ app }: { app: App }) {
  const [theme, setTheme] = useState(themes[window.localStorage.getItem('theme') === 'light' ? 'light' : 'dark']);
  const { pathname } = useLocation();

  return (
    <ThemeContext.Provider value={theme}>
      <StyledContainer background={theme.background}>
        <FlexBox align="center">
          <StyledContent>
            <Block padding="m 0 xl">
              <PageSteps
                theme={theme.theme === 'light' ? 'primary' : 'white'}
                steps={tabs.map(({ title, href }) => ({ title, href, Link }))}
                currentStep={tabs.findIndex(({ href }) => href === pathname) + 1}
                withoutIndex
              />
            </Block>
            <Switch>
              <Route
                path="/rollup/:id"
                component={({ match }: RollupRouteProps) => <RollupDetails app={app} id={+match.params.id} />}
              />
              <Route
                path="/tx/:txHash"
                component={({ match }: TxRouteProps) => (
                  <TxDetails app={app} txHash={Buffer.from(match.params.txHash, 'hex')} />
                )}
              />
              <Route exact path="/transactions">
                <LocalState app={app} />
              </Route>
              <Route exact path="/explorer">
                <GlobalState app={app} />
              </Route>
              <Route>
                <JoinSplitForm app={app} theme={theme} />
              </Route>
            </Switch>
            <Block top="xl">
              <FlexBox valign="center" align="space-between">
                <TextButton theme="implicit" color={theme.link} href="/terminal" Link={Link}>
                  <FlexBox valign="center">
                    <Block right="xs">Terminal Mode</Block>
                    <Icon name="chevron_right" />
                  </FlexBox>
                </TextButton>
                <SwitchInput
                  theme={theme.theme}
                  onClick={() => {
                    const nextTheme = theme.theme === 'light' ? 'dark' : 'light';
                    window.localStorage.setItem('theme', nextTheme);
                    setTheme(themes[nextTheme]);
                  }}
                  checked={theme.theme === 'light'}
                />
              </FlexBox>
            </Block>
          </StyledContent>
        </FlexBox>
      </StyledContainer>
    </ThemeContext.Provider>
  );
}

function LandingPage({ app }: { app: App }) {
  return (
    <Switch>
      <Route
        exact
        path="/terminal/2020"
        component={({ history }: { history: History }) => <Terminal2020 app={app} onExit={() => history.push('/')} />}
      />
      <Route
        path="/terminal"
        component={({ history }: { history: History }) => (
          <TerminalComponent app={app} terminal={new Terminal(12, 40)} onExit={() => history.push('/')} />
        )}
      />
      <Route>
        <ThemedContent app={app} />
      </Route>
    </Switch>
  );
}

async function main() {
  debug.enable('bb:*');
  const app = new App();
  ReactDOM.render(
    <BrowserRouter>
      <GlobalStyle />
      <LandingPage app={app} />
    </BrowserRouter>,
    document.getElementById('root'),
  );
}

// tslint:disable-next-line:no-console
main().catch(console.error);
