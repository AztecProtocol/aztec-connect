import { AppInitState, AppInitAction } from '@aztec/sdk';
import cx from 'clsx';
import React from 'react';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { colours } from '../../styles/colours';
import { lineHeightMap } from '../../styles/typography';
import { DefaultContentProps } from '../ensure_login';
import { Spinner } from '../spinner';

const styles = ({ fontSize, space }: Rsg.Theme) => ({
  button: {
    '&, &:hover': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: lineHeightMap.l,
      color: colours.white,
      fontSize: fontSize.h6,
    },
  },
  clickable: {
    background: colours['primary-dark'],
    cursor: 'pointer !important',
    '&:hover': {
      background: `linear-gradient(163.91deg, ${colours.primary} 18.37%, ${colours.secondary} 82.04%)`,
    },
  },
  loading: {
    '&, &:hover': {
      background: `linear-gradient(163.91deg, ${colours.primary} 18.37%, ${colours.secondary} 82.04%)`,
      cursor: 'default',
      userSelect: 'none',
    },
  },
  disabled: {
    '&, &:hover': {
      background: colours['grey-darker'],
      cursor: 'default',
      userSelect: 'none',
    },
  },
  icon: {
    lineHeight: 0,
    paddingRight: space[2],
  },
});

interface ButtonProps extends JssInjectedProps {
  text: string | React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const Button: React.FunctionComponent<ButtonProps> = ({ classes, text, loading, disabled, onClick }) => {
  if (!onClick) {
    return (
      <div className={cx(classes.button, { [classes.loading]: loading, [classes.disabled]: disabled })}>
        {loading && (
          <div className={classes.icon}>
            <Spinner theme="white" size="h5" />
          </div>
        )}
        {text}
      </div>
    );
  }

  return (
    <div className={cx(classes.button, classes.clickable)} onClick={onClick}>
      {text}
    </div>
  );
};

interface InitButtonProps extends JssInjectedProps, DefaultContentProps {}

const InitButtonRenderer: React.FunctionComponent<InitButtonProps> = ({ classes, app, initStatus }) => {
  if (!initStatus || initStatus.initState === AppInitState.UNINITIALIZED) {
    return <Button classes={classes} text="Initialize SDK" onClick={() => app.createSdk()} />;
  }

  if (initStatus.initAction === AppInitAction.AWAIT_LINK_AZTEC_ACCOUNT) {
    return (
      <Button
        classes={classes}
        text={`Link ${initStatus.account!.toString().slice(0, 6)}...${initStatus
          .account!.toString()
          .slice(-4)} to Aztec.`}
        onClick={() => app.getWebSdk().linkAccount()}
      />
    );
  }

  if (initStatus.initAction === AppInitAction.CHANGE_NETWORK) {
    return <>{`Please switch your wallet's network to ${initStatus.network} to use the interactive docs.`}</>;
  }

  if (initStatus.initAction === AppInitAction.LINK_PROVIDER_ACCOUNT) {
    return <Button classes={classes} text="Check MetaMask to link Ethereum account..." loading />;
  }

  if (initStatus.initAction === AppInitAction.LINK_AZTEC_ACCOUNT) {
    return <Button classes={classes} text="Check for MetaMask signature request to link Aztec account..." loading />;
  }

  return <Button classes={classes} text={initStatus.message || 'Initializing...'} loading />;
};

export const InitButton = Styled<InitButtonProps>(styles)(InitButtonRenderer);
