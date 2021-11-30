import React from 'react';
import styled from 'styled-components';
import { Asset, formatBaseUnits } from '../../app';
import { Button, Text } from '../../components';
import mergeIcon from '../../images/merge.svg';
import { breakpoints, FontSize, gradients, spacings } from '../../styles';

const getPrecision = (value: bigint, decimals: number) =>
  value >= 100n * BigInt('1'.padEnd(decimals + 1, '0')) ? 0 : 2;

const getValueFontSize = (valueStr: string): FontSize => {
  const len = valueStr.replace('.', '').length;
  if (len >= 5) {
    return 'xxs';
  }
  if (len >= 4) {
    return 'xs';
  }
  return 's';
};

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
}) => {
  const oldValueStr = formatBaseUnits(prevAmount, asset.decimals, {
    precision: getPrecision(prevAmount, asset.decimals),
    commaSeparated: true,
  });
  const newValueStr = formatBaseUnits(amount, asset.decimals, {
    precision: getPrecision(amount, asset.decimals),
    commaSeparated: true,
  });
  const valueFontSize = getValueFontSize(newValueStr.length > oldValueStr.length ? newValueStr : oldValueStr);
  return (
    <div className={className}>
      <Root>
        <ValuesRoot>
          <OldValue>
            <Text text={oldValueStr} size={valueFontSize} />
          </OldValue>
          <MergeIconRoot>
            <MergeIcon src={mergeIcon} alt=">" />
          </MergeIconRoot>
          <NewValue>
            <Text text={newValueStr} color="white" size={valueFontSize} />
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
};
