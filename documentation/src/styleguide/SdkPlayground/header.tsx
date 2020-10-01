import React from 'react';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { App } from '../app';
import { EthFaucet } from './eth_faucet';
import { EnsureLogin } from '../ensure_login';
import { lineHeightMap } from '../../styles/typography';

export const styles = ({ space, color, fontSize }: Rsg.Theme) => ({
  head: {
    display: 'flex',
    alignItem: 'center',
    justifyContent: 'space-between',
    padding: [[space[2], space[3]]],
    borderRadius: [[4, 4, 0, 0]],
    borderWidth: [[1, 1, 0, 1]],
    borderStyle: 'solid',
    borderColor: color.border,
    fontSize: fontSize.h6,
    lineHeight: lineHeightMap.xs,
  },
});

interface HeaderRendererProps extends JssInjectedProps {
  app: App;
}

const HeaderRenderer: React.FunctionComponent<HeaderRendererProps> = ({ classes, app }) => {
  return (
    <EnsureLogin app={app} DefaultContent={() => <div className={classes.head}>{'Account not linked.'}</div>}>
      {({ account }) => (
        <div className={classes.head}>
          <EthFaucet app={app} account={account} />
          <div>{`${account.toString().slice(0, 10)}...${account.toString().slice(-4)}`}</div>
        </div>
      )}
    </EnsureLogin>
  );
};

export const Header = Styled<HeaderRendererProps>(styles)(HeaderRenderer);
