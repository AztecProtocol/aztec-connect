import { AssetId } from '@aztec/sdk';
import clsx from 'clsx';
import React from 'react';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { colours } from '../../styles/colours';
import { lineHeightMap } from '../../styles/typography';
import { App } from '../app';
import { EnsureLogin } from '../ensure_login';
import { Spinner } from '../spinner';
import { UserContainer, PrivateAssetContainer, PublicAssetContainer } from '../user_container';
import { InitButton } from './init_button';

export const styles = ({ space, fontSize }: Rsg.Theme) => ({
  controls: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: lineHeightMap.l,
    background: colours['grey-darker'],
    color: colours.white,
    fontSize: fontSize.h6,
  },
  message: {
    padding: space[2],
  },
  buttons: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    padding: [[space[0], space[2]]],
  },
  run: {
    '&, &:hover': {
      display: 'flex',
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      padding: [[space[0], space[4]]],
      height: lineHeightMap.l,
      background: colours['primary-dark'],
      cursor: 'pointer !important',
    },
    '&:hover': {
      background: `linear-gradient(140deg, ${colours.primary} 0, ${colours.secondary} 100%)`,
    },
  },
  running: {
    '&, &:hover': {
      position: 'relative',
      color: colours.transparent,
      background: `linear-gradient(140deg, ${colours.primary} 0, ${colours.secondary} 100%)`,
      userSelect: 'none',
      cursor: 'default !important',
    },
  },
  spinner: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translateX(-50%) translateY(-50%)',
    lineHeight: 0,
  },
  balance: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space[2],
  },
  label: {
    paddingRight: space[1],
  },
  value: {
    paddingRight: space[2],
  },
  inlineButton: {
    '&, &:hover': {
      padding: [[space[1], space[2]]],
      background: '#646567',
      fontSize: fontSize.small,
      lineHeight: 1,
      borderRadius: 16,
      cursor: 'pointer',
    },
    '&:hover': {
      background: '#717682',
    },
  },
});

interface ControlsRendererProps extends JssInjectedProps {
  app: App;
  runCode: () => void;
  running: boolean;
}

const ControlsRenderer: React.FunctionComponent<ControlsRendererProps> = ({ classes, app, runCode, running }) => {
  const assetId = app.getAssetId();

  const UnsupportedContent = () => (
    <div className={classes.message}>Switch to a browser that has MetaMask installed to use the interactive docs.</div>
  );

  return (
    <div className={classes.controls}>
      <EnsureLogin app={app} DefaultContent={InitButton} UnsupportedContent={UnsupportedContent}>
        {({ sdk, account }) => (
          <div className={classes.buttons}>
            <UserContainer app={app} account={account}>
              {({ user }) => (
                <div className={classes.info}>
                  <div className={classes.balance}>
                    <div className={classes.label}>Private Balance:</div>
                    <PrivateAssetContainer sdk={sdk} user={user!} assetId={assetId}>
                      {({ asset, balance }) => <>{asset.fromBaseUnits(balance)}</>}
                    </PrivateAssetContainer>
                  </div>
                  {assetId !== AssetId.ETH && (
                    <div className={classes.balance}>
                      <div className={classes.label}>Public Balance:</div>
                      <PublicAssetContainer sdk={sdk} user={user!} assetId={assetId}>
                        {({ asset, balance }) => (
                          <>
                            <div className={classes.value}>{asset.fromBaseUnits(balance)}</div>
                            <div
                              className={classes.inlineButton}
                              onClick={async () => {
                                await asset.mint(BigInt(asset.toBaseUnits('100')));
                              }}
                            >
                              Get Tokens
                            </div>
                          </>
                        )}
                      </PublicAssetContainer>
                    </div>
                  )}
                </div>
              )}
            </UserContainer>
            <div className={clsx(classes.run, { [classes.running]: running })} onClick={runCode}>
              Run Code
              {running && (
                <div className={classes.spinner}>
                  <Spinner theme="white" size="h5" />
                </div>
              )}
            </div>
          </div>
        )}
      </EnsureLogin>
    </div>
  );
};

export const Controls = Styled<ControlsRendererProps>(styles)(ControlsRenderer);
