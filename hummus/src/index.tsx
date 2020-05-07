import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { FlexBox, Block, SwitchInput, TextButton, Icon } from '@aztec/guacamole-ui';
import { App } from './app';
import { JoinSplitForm } from './join_split_form';
import { ThemeContext, themes } from './config/context';
import { Terminal } from './terminal2020';
import styles from './index.scss';
import './styles/guacamole.css';
import debug from 'debug';
require('barretenberg-es/wasm/barretenberg.wasm');

interface LandingPageProps {
  app: App;
}

function LandingPage({ app }: LandingPageProps) {
  const [theme, setTheme] = useState(themes.darkTheme);

  if (theme.theme === 'terminal') {
    return <Terminal app={app} onExit={() => setTheme(themes.darkTheme)} />;
  }

  return (
    <ThemeContext.Provider value={theme}>
      <Block className={styles.container} padding="xl" align="center" background={theme.background} stretch>
        <FlexBox align="center">
          <div className={styles.content}>
            <JoinSplitForm app={app} theme={theme} />
            <Block top="xl">
              <FlexBox valign="center" align="space-between">
                <FlexBox valign="center">
                  <TextButton text="Terminal Mode" color={theme.link} onClick={() => setTheme(themes.terminalTheme)} />
                  <Block padding="0 xs">
                    <Icon name="chevron_right" color={theme.link} />
                  </Block>
                </FlexBox>
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
  ReactDOM.render(<LandingPage app={app} />, document.getElementById('root'));
}

// tslint:disable-next-line:no-console
main().catch(console.error);
