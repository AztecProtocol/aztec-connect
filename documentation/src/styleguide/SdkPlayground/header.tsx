import React from 'react';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { App } from '../app';
import { EthFaucet } from './eth_faucet';
import { EnsureLogin } from '../ensure_login';

export const styles = ({ space, color, fontSize }: Rsg.Theme) => ({
  head: {
    display: 'flex',
    alignItem: 'center',
    justifyContent: 'space-between',
    padding: [[space[2], space[3]]],
    borderRadius: [[4, 4, 0, 0]],
    border: [[1, color.border, 'solid']],
    fontSize: fontSize.h6,
  },
});

interface HeaderRendererProps extends JssInjectedProps {
  app: App;
}

const HeaderRenderer: React.FunctionComponent<HeaderRendererProps> = ({ classes, app }) => {
  return (
    <div className={classes.head}>
      <EnsureLogin app={app} DefaultContent={() => <>{'Account not linked.'}</>}>
        {({ account }) => (
          <>
            <EthFaucet app={app} account={account} />
            <div>{`${account.toString().slice(0, 10)}...${account.toString().slice(-4)}`}</div>
          </>
        )}
      </EnsureLogin>
    </div>
  );
};

export const Header = Styled<HeaderRendererProps>(styles)(HeaderRenderer);
