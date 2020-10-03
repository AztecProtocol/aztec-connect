import { formatUnits } from '@ethersproject/units';
import { ActionState, EthAddress, SdkEvent } from '@aztec/sdk';
import React, { useState, useEffect } from 'react';
import Link from 'react-styleguidist/lib/client/rsg-components/Link';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { App } from '../app';
import { Icon } from '../icon';

interface EthBalanceProps extends JssInjectedProps {
  app: App;
  address: EthAddress;
}

const EthBalance = ({ classes, app, address }: EthBalanceProps) => {
  const [initialized, setInitialized] = useState(false);
  const [balance, setBalance] = useState(BigInt(0));
  const sdk = app.getWebSdk();

  useEffect(() => {
    const refreshBalance = async () => {
      const balance = await app.getEthBalance(address);
      setBalance(balance);
    };

    refreshBalance();
    setInitialized(true);

    const handleActionState = (actionState: ActionState) => {
      if (['APPROVE', 'MINT'].indexOf(actionState.action) >= 0) {
        refreshBalance();
      }
    };

    sdk.on(SdkEvent.UPDATED_ACTION_STATE, handleActionState);

    return () => {
      sdk.off(SdkEvent.UPDATED_ACTION_STATE, handleActionState);
    };
  }, [sdk, address]);

  if (!initialized) {
    return <></>;
  }

  return <div className={classes.balance}>{`${formatUnits(balance.toString(), 18)} ETH`}</div>;
};

export const styles = ({ space, fontSize, color }: Rsg.Theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: {
    color: color.light,
    paddingRight: space[1],
  },
  text: {
    maxWidth: 0,
    height: fontSize.small,
    fontSize: fontSize.small,
    lineHeight: 0,
    overflow: 'hidden',
  },
  button: {
    '&, &:hover': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[1],
      background: '#e4e4e4',
      lineHeight: 0,
      borderRadius: 16,
    },
    '&, & *': {
      cursor: 'pointer !important',
    },
    '&:hover': {
      padding: [[space[1], space[2], space[1], space[1]]],
      '& $text': {
        height: fontSize.small,
        fontSize: fontSize.small,
        lineHeight: 1,
        paddingLeft: space[1],
        maxWidth: '100px',
      },
    },
  },
});

interface EthFaucetRendererProps extends JssInjectedProps {
  app: App;
  account: EthAddress;
}

const EthFaucetRenderer: React.FunctionComponent<EthFaucetRendererProps> = ({ classes, app, account }) => {
  return (
    <div className={classes.root}>
      <EthBalance classes={classes} app={app} address={account} />
      <Link className={classes.button} href="https://faucet.ropsten.be/" target="_blank">
        <Icon name="local_gas_station" size="small" />
        <div className={classes.text}>Get ETH</div>
      </Link>
    </div>
  );
};

export const EthFaucet = Styled<EthFaucetRendererProps>(styles)(EthFaucetRenderer);
