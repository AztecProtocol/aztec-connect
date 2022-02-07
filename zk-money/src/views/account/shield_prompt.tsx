import React from 'react';
import styled from 'styled-components/macro';
import { Asset, formatBaseUnits } from '../../app';
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
  pendingBalance: bigint;
  onSubmit: () => void;
}

export const ShieldPrompt: React.FunctionComponent<ShieldPromptProps> = ({
  asset,
  balance,
  pendingBalance,
  onSubmit,
}) => (
  <Root>
    <Message size="m">
      {pendingBalance > 0n ? (
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
      ) : balance > 0n ? (
        <>
          Add to your <Text text={`zk${asset.symbol}`} weight="bold" inline /> by shielding more {asset.symbol}.
        </>
      ) : (
        <>
          {'You don’t have any '}
          <Text text={`zk${asset.symbol}`} weight="bold" inline />
          {`, shield ${asset.symbol} to get started!`}
        </>
      )}
    </Message>
    <ButtonRoot>
      <Button theme="gradient" text="Shield" onClick={onSubmit} />
    </ButtonRoot>
  </Root>
);
