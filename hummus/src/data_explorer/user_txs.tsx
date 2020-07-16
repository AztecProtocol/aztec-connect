import React, { useState, useEffect } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom';
import { Block, Text, FlexBox, TextButton } from '@aztec/guacamole-ui';
import { ProofEvent, ProofState, App, AppEvent } from '../app';
import { ThemeContext } from '../config/context';
import { StatusRow, TmpRow } from './status_row';
import { SdkEvent, UserTx } from 'aztec2-sdk';

interface UserTxsProps {
  userId: number;
  app: App;
}

const actionTextMapping = {
  DEPOSIT: 'Deposited',
  WITHDRAW: 'Withdrew',
  TRANSFER: 'Transferred',
  PUBLIC_TRANSFER: 'Public Sent',
  RECEIVE: 'Received',
  MINT: 'Minted',
};

const actionIconMapping = {
  DEPOSIT: 'play_for_work',
  WITHDRAW: 'call_merge',
  TRANSFER: 'import_export',
  PUBLIC_TRANSFER: 'import_export',
  RECEIVE: 'flare',
  MINT: 'play_for_work',
  NADA: '',
};

const actionIconColorMapping = {
  DEPOSIT: 'green',
  WITHDRAW: 'yellow',
  TRANSFER: 'secondary',
  PUBLIC_TRANSFER: 'white',
  RECEIVE: 'orange',
  MINT: 'white',
  NADA: '',
};

const actionIconBackgroundMapping = {
  DEPOSIT: '',
  WITHDRAW: '',
  TRANSFER: '',
  PUBLIC_TRANSFER: 'secondary',
  RECEIVE: '',
  MINT: 'green',
  NADA: '',
};

export const UserTxs = ({ userId, app }: UserTxsProps) => {
  const [txs, setTxs] = useState<UserTx[]>([]);
  const [currentProof, setCurrentProof] = useState<ProofEvent | undefined>(undefined);

  useEffect(() => {
    const updatedUserTx = async (updatedUserId: number) => {
      if (updatedUserId !== userId) {
        return;
      }
      setTxs(await app.getUserTxs(updatedUserId));

      const proof = app.getProofState();
      const isOwnedByUser = proof.input && proof.input.userId === userId;
      if (isOwnedByUser) {
        setCurrentProof(proof);
      } else if (currentProof) {
        setCurrentProof(undefined);
      }
    };

    const updatedProofState = (proof: ProofEvent) => updatedUserTx(proof.input!.userId);

    updatedUserTx(userId);

    app.on(AppEvent.UPDATED_PROOF_STATE, updatedProofState);
    app.on(SdkEvent.UPDATED_USER_TX, updatedUserTx);

    return () => {
      app.off(AppEvent.UPDATED_PROOF_STATE, updatedProofState);
      app.off(SdkEvent.UPDATED_USER_TX, updatedUserTx);
    };
  }, [app]);

  const hasPendingProof = currentProof?.state === ProofState.RUNNING;

  if (!hasPendingProof && !txs.length) {
    return (
      <ThemeContext.Consumer>{({ colorLight }) => <Text text="No data." color={colorLight} />}</ThemeContext.Consumer>
    );
  }

  const txsNodes = (
    <ThemeContext.Consumer>
      {({ theme, link, colorLight }) =>
        txs.map(({ txHash, action, value, recipient, settled, created }, i) => {
          const txHashStr = txHash.toString('hex');
          return (
            <Block
              key={txHashStr}
              padding="xs 0"
              hasBorderTop={i > 0 || hasPendingProof}
              borderColor={theme === 'light' ? 'grey-lighter' : 'white-lightest'}
            >
              <StatusRow
                iconName={actionIconMapping[action]}
                iconColor={actionIconColorMapping[action]}
                iconBackground={actionIconBackgroundMapping[action]}
                iconShape="square"
                id={
                  action === 'RECEIVE' ? (
                    'Anonymous'
                  ) : (
                    <TextButton
                      text={`0x${txHashStr.slice(0, 10)}`}
                      href={`/tx/${txHashStr}`}
                      color={link}
                      Link={Link}
                    />
                  )
                }
                status={settled ? 'SETTLED' : 'PENDING'}
                created={created}
              >
                <FlexBox direction="column">
                  <span>
                    <Text text={`${actionTextMapping[action]}: `} size="xxs" color={colorLight} />
                    <Text text={app.toTokenValueString(BigInt(value))} size="xxs" />
                  </span>
                  {action !== 'RECEIVE' && (
                    <FlexBox>
                      <Text text="To:" size="xxs" color={colorLight} />
                      <Block left="xs">
                        <CopyToClipboard text={recipient.toString('hex')}>
                          <span style={{ position: 'relative', cursor: 'pointer' }} title="Click to copy">
                            <Text text={`0x${recipient.slice(0, 5).toString('hex')}...`} size="xxs" />
                          </span>
                        </CopyToClipboard>
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

  if (!hasPendingProof) {
    return txsNodes;
  }

  const proofInput = currentProof!.input!;
  const proofAction = currentProof!.action!;

  return (
    <>
      <ThemeContext.Consumer>
        {({ colorLight }) => (
          <Block key="pending" padding="xs 0">
            <TmpRow
              iconName={actionIconMapping[proofAction]}
              status={currentProof!.state === ProofState.FAILED ? 'FAILED' : 'PENDING'}
              statusColor={currentProof!.state === ProofState.FAILED ? 'red' : colorLight}
              created={proofInput.created}
            >
              <FlexBox direction="column">
                <span>
                  <Text text={`${actionTextMapping[proofAction]}: `} size="xxs" color={colorLight} />
                  <Text text={app.toTokenValueString(proofInput.value)} size="xxs" />
                </span>
                <FlexBox>
                  <Text text="To:" size="xxs" color={colorLight} />
                  <Block left="xs">
                    <CopyToClipboard text={proofInput.recipient.toString('hex')}>
                      <span style={{ position: 'relative', cursor: 'pointer' }} title="Click to copy">
                        <Text text={`0x${proofInput.recipient.slice(0, 5).toString('hex')}...`} size="xxs" />
                      </span>
                    </CopyToClipboard>
                  </Block>
                </FlexBox>
              </FlexBox>
            </TmpRow>
          </Block>
        )}
      </ThemeContext.Consumer>
      {txsNodes}
    </>
  );
};
