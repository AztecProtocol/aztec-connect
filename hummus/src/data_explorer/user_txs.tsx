import { Block, FlexBox, Text, TextButton } from '@aztec/guacamole-ui';
import { Action, ActionState, AssetId, EthUserId, SdkEvent, UserTx, WebSdk } from 'aztec2-sdk';
import React, { useEffect, useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../config/context';
import { StatusRow, TmpRow } from './status_row';

interface UserTxsProps {
  app: WebSdk;
  account: EthUserId;
}

const actionTextMapping = {
  DEPOSIT: 'Deposited',
  WITHDRAW: 'Withdrew',
  TRANSFER: 'Transferred',
  PUBLIC_TRANSFER: 'Public Sent',
  RECEIVE: 'Received',
  MINT: 'Minted',
  ACCOUNT: 'Account',
};

const actionIconMapping = {
  DEPOSIT: 'play_for_work',
  WITHDRAW: 'call_merge',
  TRANSFER: 'import_export',
  PUBLIC_TRANSFER: 'import_export',
  RECEIVE: 'flare',
  MINT: 'play_for_work',
  ACCOUNT: '',
};

const actionIconColorMapping = {
  DEPOSIT: 'green',
  WITHDRAW: 'yellow',
  TRANSFER: 'secondary',
  PUBLIC_TRANSFER: 'white',
  RECEIVE: 'orange',
  MINT: 'white',
  ACCOUNT: '',
};

const actionIconBackgroundMapping = {
  DEPOSIT: '',
  WITHDRAW: '',
  TRANSFER: '',
  PUBLIC_TRANSFER: 'secondary',
  RECEIVE: '',
  MINT: 'green',
  ACCOUNT: '',
};

export const UserTxs = ({ account, app }: UserTxsProps) => {
  const sdk = app.getSdk();
  const user = sdk.getUser(account)!;
  const userAsset = user.getAsset(AssetId.DAI);
  const [txs, setTxs] = useState<UserTx[]>([]);
  const [actionState, setActionState] = useState<ActionState | undefined>(undefined);

  useEffect(() => {
    const updatedUserState = async (ethUserId: EthUserId) => {
      if (!ethUserId.equals(account)) {
        return;
      }
      setTxs(await user.getTxs());

      const actionState = sdk.getActionState(account);
      setActionState(actionState);
    };

    updatedUserState(account);

    sdk.on(SdkEvent.UPDATED_USER_STATE, updatedUserState);

    return () => {
      sdk.off(SdkEvent.UPDATED_USER_STATE, updatedUserState);
    };
  }, [sdk]);

  const hasPendingAction = actionState?.txHash === undefined && !actionState?.error === undefined;

  if (!hasPendingAction && !txs.length) {
    return (
      <ThemeContext.Consumer>{({ colorLight }) => <Text text="No data." color={colorLight} />}</ThemeContext.Consumer>
    );
  }

  const txsNodes = (
    <ThemeContext.Consumer>
      {({ theme, link, colorLight }) =>
        txs.map(({ txHash, action, value, recipient, settled, created }, i) => {
          const txHashStr = txHash.toString();
          return (
            <Block
              key={txHashStr}
              padding="xs 0"
              hasBorderTop={i > 0 || hasPendingAction}
              borderColor={theme === 'light' ? 'grey-lighter' : 'white-lightest'}
            >
              <StatusRow
                iconName={actionIconMapping[action]}
                iconColor={actionIconColorMapping[action]}
                iconBackground={actionIconBackgroundMapping[action]}
                iconShape="square"
                id={
                  <TextButton text={`${txHashStr.slice(0, 12)}`} href={`/tx/${txHashStr}`} color={link} Link={Link} />
                }
                status={settled ? 'SETTLED' : 'PENDING'}
                created={created}
              >
                <FlexBox direction="column">
                  <span>
                    <Text text={`${actionTextMapping[action]}: `} size="xxs" color={colorLight} />
                    <Text text={userAsset.fromErc20Units(value)} size="xxs" />
                  </span>
                  {action !== 'RECEIVE' && (
                    <FlexBox>
                      <Text text="To:" size="xxs" color={colorLight} />
                      <Block left="xs">
                        {!recipient && <Text text="unknown" size="xxs" color={colorLight} />}
                        {!!recipient && (
                          <CopyToClipboard text={recipient.toString('hex')}>
                            <span style={{ position: 'relative', cursor: 'pointer' }} title="Click to copy">
                              <Text text={`0x${recipient.slice(0, 5).toString('hex')}...`} size="xxs" />
                            </span>
                          </CopyToClipboard>
                        )}
                      </Block>
                    </FlexBox>
                  )}
                </FlexBox>
              </StatusRow>
            </Block>
          );
        })
      }
    </ThemeContext.Consumer>
  );

  if (!hasPendingAction || !actionState) {
    return txsNodes;
  }
  const action = actionState.action;
  if (action === Action.APPROVE) {
    return txsNodes;
  }

  return (
    <>
      <ThemeContext.Consumer>
        {({ colorLight }) => (
          <Block key="pending" padding="xs 0">
            <TmpRow
              iconName={actionIconMapping[action]}
              status={actionState.error ? 'FAILED' : 'PENDING'}
              statusColor={actionState.error ? 'red' : colorLight}
              created={actionState.created}
            >
              <FlexBox>
                <Text text={`${actionTextMapping[action]}: `} size="xxs" color={colorLight} />
                <Text text={userAsset.fromErc20Units(actionState.value)} size="xxs" />
              </FlexBox>
            </TmpRow>
          </Block>
        )}
      </ThemeContext.Consumer>
      {txsNodes}
    </>
  );
};
