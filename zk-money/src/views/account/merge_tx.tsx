import React from 'react';
import styled from 'styled-components';
import { Asset, fromBaseUnits } from '../../app';
import { Button, Text } from '../../components';
import mergeIcon from '../../images/merge.svg';
import { breakpoints, gradients, spacings } from '../../styles';

const Root = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: ${breakpoints.s}) {
    flex-wrap: wrap;
  }
`;

const Item = styled.div`
  padding: ${spacings.xxs} 0;
`;

const ValuesRoot = styled(Item)`
  display: flex;
  align-items: center;
`;

const ValueWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 100%;
`;

const MergeIconRoot = styled.div`
  padding: 0 ${spacings.s};
`;

const MergeIcon = styled.img`
  height: 16px;
`;

const OldValue = styled(ValueWrapper)`
  border: 3px solid rgba(53, 35, 255, 0.13);
`;

const NewValue = styled(ValueWrapper)`
  background: linear-gradient(134.14deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%);
`;

const FeeRoot = styled(Item)`
  text-align: center;
  flex: 1;

  @media (max-width: ${breakpoints.s}) {
    display: none;
  }
`;

interface MergeTxProps {
  className?: string;
  asset: Asset;
  prevAmount: bigint;
  amount: bigint;
  fee: string;
  onSubmit(): void;
}

export const MergeTx: React.FunctionComponent<MergeTxProps> = ({
  className,
  asset,
  prevAmount,
  amount,
  fee,
  onSubmit,
}) => (
  <div className={className}>
    <Root>
      <ValuesRoot>
        <OldValue>
          <Text text={fromBaseUnits(prevAmount, asset.decimals, 2)} size="s" />
        </OldValue>
        <MergeIconRoot>
          <MergeIcon src={mergeIcon} alt=">" />
        </MergeIconRoot>
        <NewValue>
          <Text text={fromBaseUnits(amount, asset.decimals, 2)} color="white" size="s" />
        </NewValue>
      </ValuesRoot>
      <FeeRoot>
        <Text text={`Fee: ${fee} zk${asset.symbol}`} size="s" />
      </FeeRoot>
      <Item>
        <Button theme="gradient" text="Merge" onClick={onSubmit} />
      </Item>
    </Root>
  </div>
);
