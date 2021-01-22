import './styles/guacamole.css';
import { Block, FlexBox } from '@aztec/guacamole-ui';
import { WebSdk } from 'aztec2-sdk';
import debug from 'debug';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import styled, { createGlobalStyle } from 'styled-components';
import { ThemeContext, themes } from './config/context';
import { Terminal, TerminalComponent } from './terminal';
require('barretenberg/wasm/barretenberg.wasm');

declare global {
  interface Window {
    web3: any;
    ethereum: any;
  }
}

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

const Unsupported = () => {
  const [theme] = useState(themes.dark);
  return (
    <ThemeContext.Provider value={theme}>
      <StyledContainer background={theme.background}>
        <FlexBox align="center">
          <StyledContent>
            <Block padding="m 0 xl">This application requires Chrome with the MetaMask extension installed.</Block>
          </StyledContent>
        </FlexBox>
      </StyledContainer>
    </ThemeContext.Provider>
  );
};

function LandingPage({ app }: { app: WebSdk }) {
  return <TerminalComponent app={app} terminal={new Terminal(12, 40)} />;
}

async function main() {
  if (!debug.enabled('bb:') && process.env.NODE_ENV !== 'production') {
    debug.enable('bb:*');
    location.reload();
  }
  if (!window.ethereum) {
    ReactDOM.render(
      <>
        <GlobalStyle />
        <Unsupported />
      </>,
      document.getElementById('root'),
    );
  } else {
    // Have to do this early to silence warning.
    window.ethereum.autoRefreshOnNetworkChange = false;

    const app = new WebSdk(window.ethereum);
    ReactDOM.render(
      <>
        <GlobalStyle />
        <LandingPage app={app} />
      </>,
      document.getElementById('root'),
    );
  }
}

// tslint:disable-next-line:no-console
main().catch(console.error);
