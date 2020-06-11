import React, { useState, useEffect } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Link } from 'react-router-dom';
import { Block, Text, FlexBox, TextButton } from '@aztec/guacamole-ui';
import { ProofEvent, ProofState } from '../app';
import { ThemeContext } from '../config/context';
import { UserTx } from '../user_state';
import { StatusRow, TmpRow } from './status_row';

interface UserTxsProps {
  userId: number;
  bindSetter: (setter: (userId: number) => void) => void;
  unbindSetter: (setter: (userId: number) => void) => void;
  initialData: UserTx[];
  bindProofSetter: (setter: (p: ProofEvent) => void) => void;
  unbindProofSetter: (setter: (p: ProofEvent) => void) => void;
  initialProof?: ProofEvent;
  getTxs: () => UserTx[];
}

const actionTextMapping = {
  DEPOSIT: 'Deposited',
  WITHDRAW: 'Withdrew',
  TRANSFER: 'Transferred',
  RECEIVE: 'Received',
};

const actionIconMapping = {
  DEPOSIT: 'play_for_work',
  WITHDRAW: 'call_merge',
  TRANSFER: 'import_export',
  RECEIVE: 'add',
  NADA: '',
};

const actionIconColorMapping = {
  DEPOSIT: 'green',
  WITHDRAW: 'yellow',
  TRANSFER: 'secondary',
  RECEIVE: 'white',
  NADA: '',
};

const actionIconBackgroundMapping = {
  DEPOSIT: '',
  WITHDRAW: '',
  TRANSFER: '',
  RECEIVE: 'blue',
  NADA: '',
};

export const UserTxs = ({
  userId,
  bindSetter,
  unbindSetter,
  initialData,
  bindProofSetter,
  unbindProofSetter,
  initialProof,
  getTxs,
}: UserTxsProps) => {
  const [txs, setTxs] = useState(initialData);
  const [currentProof, setCurrentProof] = useState(initialProof);

  useEffect(() => {
    const trackTxs = (updatedUserId: number) => {
      if (updatedUserId !== userId) return;
      setTxs(getTxs());
    };
    const trackProof = (proof: ProofEvent) => {
      const isOwnedByUser = proof.input && proof.input.userId === userId;
      if (isOwnedByUser) {
        setCurrentProof(proof);
      } else if (currentProof) {
        setCurrentProof(undefined);
      }
    };
    bindSetter(trackTxs);
    bindProofSetter(trackProof);

    return () => {
      unbindSetter(trackTxs);
      unbindProofSetter(trackProof);
    };
  }, [bindSetter, bindProofSetter]);

  const hasPendingProof = currentProof && !!currentProof.input && !txs.find(tx => tx.txId === currentProof.txId);

  if (!hasPendingProof && !txs.length) {
    return (
      <ThemeContext.Consumer>{({ colorLight }) => <Text text="No data." color={colorLight} />}</ThemeContext.Consumer>
    );
  }

  const txsNodes = (
    <ThemeContext.Consumer>
      {({ theme, link, colorLight }) =>
        txs.map(({ txId, action, value, recipient, settled, created }, i) => (
          <Block
            key={txId}
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
                  <TextButton text={`0x${txId.slice(0, 10)}`} href={`/tx/${txId}`} color={link} Link={Link} />
                )
              }
              status={settled ? 'SETTLED' : 'PENDING'}
              created={created}
            >
              <FlexBox direction="column">
                <span>
                  <Text text={`${actionTextMapping[action]}: `} size="xxs" color={colorLight} />
                  <Text text={value} size="xxs" />
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
        ))
      }
    </ThemeContext.Consumer>
  );

  if (!hasPendingProof) {
    return txsNodes;
  }

  const proofInput = currentProof!.input!;

  return (
    <>
      <ThemeContext.Consumer>
        {({ colorLight }) => (
          <Block key="pending" padding="xs 0">
            <TmpRow
              iconName={actionIconMapping[currentProof!.api]}
              iconColor={actionIconColorMapping[currentProof!.api]}
              status={currentProof!.state === ProofState.FAILED ? 'FAILED' : 'PENDING'}
              statusColor={currentProof!.state === ProofState.FAILED ? 'red' : colorLight}
              created={proofInput.created}
            >
              <FlexBox direction="column">
                <span>
                  <Text
                    text={`${actionTextMapping[currentProof!.api as keyof typeof actionTextMapping]}: `}
                    size="xxs"
                    color={colorLight}
                  />
                  <Text text={proofInput.value} size="xxs" />
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
