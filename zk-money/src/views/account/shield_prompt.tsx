import React from 'react';
import styled from 'styled-components';
import { Asset, formatBaseUnits } from '../../app';
import { PendingBalance } from '../../app/eth_account/pending_balance';
import { Button, Text } from '../../components';
import { breakpoints, spacings } from '../../styles';

const Root = styled.div`
  display: flex;
  align-items: center;

  @media (max-width: ${breakpoints.s}) {
    flex-direction: column;
  }
`;

const Message = styled(Text)`
  flex: 1;
  padding-right: ${spacings.s};

  @media (max-width: ${breakpoints.s}) {
    padding-right: 0;
    padding-bottom: ${spacings.s};
    text-align: center;
  }
`;

const ButtonRoot = styled.div`
  flex-shrink: 0;
`;

interface ShieldPromptProps {
  asset: Asset;
  balance: bigint;
  pendingValue: bigint;
  pendingBalance: bigint;
  onSubmit: () => void;
}

interface PendingBalanceMessageProps {
  pendingBalance: bigint;
  asset: Asset;
}

interface ShieldMoreMessageProps {
  asset: Asset;
}

interface NoBalanceMessageProps {
  asset: Asset;
}

export const ShieldPrompt: React.FunctionComponent<ShieldPromptProps> = ({
  asset,
  balance,
  pendingBalance,
  pendingValue = 0n,
  onSubmit,
}) => {
  const isBalancePending = pendingBalance > 0n;
  const hasBalance = balance > 0n;
  const hasBalancePendingRollup = pendingValue > 0n;
  const isAllBalancePendingRollup = pendingValue < 0n && balance + pendingValue === 0n;

  let message;
  if (isBalancePending) {
    message = <PendingBalanceMessage pendingBalance={pendingBalance} asset={asset} />;
  } else if ((hasBalance || hasBalancePendingRollup) && !isAllBalancePendingRollup) {
    message = <ShieldMoreMessage asset={asset} />;
  } else {
    message = <NoBalanceMessage asset={asset} />;
  }

  return (
    <Root>
      <Message size="m">{message}</Message>
      <ButtonRoot>
        <Button theme="gradient" text="Shield" onClick={onSubmit} />
      </ButtonRoot>
    </Root>
  );
};

const PendingBalanceMessage: React.FunctionComponent<PendingBalanceMessageProps> = ({ pendingBalance, asset }) => {
  return (
    <>
      {'You have '}
      <Text
        text={`${formatBaseUnits(pendingBalance, asset.decimals, {
          precision: asset.preferredFractionalDigits,
          commaSeparated: true,
        })} ${asset.symbol}`}
        weight="bold"
        inline
      />
      {` pending, shield to get started!`}
    </>
  );
};

const ShieldMoreMessage: React.FunctionComponent<ShieldMoreMessageProps> = ({ asset }) => {
  return (
    <>
      Add to your <Text text={`zk${asset.symbol}`} weight="bold" inline /> by shielding more {asset.symbol}.
    </>
  );
};

const NoBalanceMessage: React.FunctionComponent<NoBalanceMessageProps> = ({ asset }) => {
  return (
    <>
      {'You don’t have any '}
      <Text text={`zk${asset.symbol}`} weight="bold" inline />
      {`, shield ${asset.symbol} to get started!`}
    </>
  );
};
