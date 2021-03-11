import React from 'react';
import styled, { css } from 'styled-components';
import { Asset, convertToPriceString, fromBaseUnits } from '../../app';
import { Button, Dot, GradientBlock, Text, Tooltip } from '../../components';
import { breakpoints, fontSizes, lineHeights, spacings } from '../../styles';

const ColContent = styled.div`
  flex: 1;
`;

const ColButton = styled.div`
  flex-shrink: 0;
`;

const Title = styled(Text)`
  display: flex;
  align-items: center;
`;

const SubTitle = styled(Text)`
  padding-left: ${spacings.xs};
`;

const symbolClassName = 'symbol';

const Value = styled(Text)`
  padding-right: ${spacings.xs};
`;

type ValueLen = 'ss' | 's' | 'm' | 'l' | 'll' | 'lll';

const getValueLen = (value: string): ValueLen => {
  const len = value.replace(/\./, '').length;
  if (len <= 4) {
    return 'ss';
  }
  if (len <= 7) {
    return 's';
  }
  if (len <= 10) {
    return 'm';
  }
  if (len <= 12) {
    return 'l';
  }
  if (len <= 15) {
    return 'll';
  }
  return 'lll';
};

const valueLens = {
  ss: css`
    font-size: ${fontSizes.l};
    @media (max-width: ${breakpoints.xs}) {
      font-size: ${fontSizes.m};
    }
  `,
  s: css`
    font-size: ${fontSizes.l};
    @media (max-width: ${breakpoints.xl}) {
      font-size: ${fontSizes.m};
    }
    @media (max-width: ${breakpoints.m}) {
      font-size: ${fontSizes.l};
    }
    @media (max-width: ${breakpoints.xs}) {
      font-size: ${fontSizes.m};
    }
  `,
  m: css`
    font-size: ${fontSizes.m};
    @media (max-width: ${breakpoints.l}) {
      font-size: ${fontSizes.s};
    }
    @media (max-width: ${breakpoints.m}) {
      font-size: ${fontSizes.l};
    }
    @media (max-width: ${breakpoints.xs}) {
      font-size: ${fontSizes.s};
    }
  `,
  l: css`
    font-size: ${fontSizes.m};
    @media (max-width: ${breakpoints.l}) {
      font-size: ${fontSizes.xs};
    }
    @media (max-width: ${breakpoints.m}) {
      font-size: ${fontSizes.l};
    }
    @media (max-width: ${breakpoints.xs}) {
      font-size: ${fontSizes.xs};
    }
  `,
  ll: css`
    font-size: ${fontSizes.s};
    @media (max-width: ${breakpoints.l}) {
      font-size: ${fontSizes.xs};
    }
    @media (max-width: ${breakpoints.m}) {
      font-size: ${fontSizes.l};
    }
    @media (max-width: ${breakpoints.xs}) {
      font-size: ${fontSizes.xs};
    }
  `,
  lll: css`
    font-size: ${fontSizes.xs};
    @media (max-width: ${breakpoints.l}) {
      font-size: ${fontSizes.xxs};
    }
    @media (max-width: ${breakpoints.m}) {
      font-size: ${fontSizes.m};
    }
    @media (max-width: ${breakpoints.xs}) {
      font-size: ${fontSizes.xxs};
    }
  `,
};

interface ValueRootProps {
  len: ValueLen;
}

const ValueRoot = styled.div<ValueRootProps>`
  display: flex;
  align-items: center;
  line-height: ${lineHeights.l};
  ${({ len }) => valueLens[len]}

  .${symbolClassName} {
    @media (min-width: ${parseInt(breakpoints.l) + 1}px) {
      ${({ len }) => len === 'lll' && 'display: none;'}
    }
    @media (max-width: ${breakpoints.l}) and (min-width: ${parseInt(breakpoints.m) + 1}px) {
      ${({ len }) => (len === 'lll' || len === 'll') && 'display: none;'}
    }
    @media (max-width: ${breakpoints.xs}) {
      ${({ len }) => (len === 'lll' || len === 'll') && 'display: none;'}
    }
  }
`;

const PendingTxsTooltip = styled(Tooltip)`
  padding-left: ${spacings.xs};
`;

interface ValueSummaryProps {
  className?: string;
  title: string;
  value: bigint;
  price?: bigint;
  pendingValue?: bigint;
  pendingTxs?: number;
  asset: Asset;
  buttonText: string;
  onClick: () => void;
}

export const ValueSummary: React.FunctionComponent<ValueSummaryProps> = ({
  className,
  title,
  value,
  price,
  pendingValue = 0n,
  pendingTxs = 0,
  asset,
  buttonText,
  onClick,
}) => {
  const totalBalance = value + pendingValue;
  const valueStr = fromBaseUnits(totalBalance, asset.decimals);

  return (
    <GradientBlock className={className}>
      <ColContent>
        <Title size="m" nowrap>
          {title}
          {!!price && !!totalBalance && (
            <SubTitle size="s" text={`$${convertToPriceString(totalBalance, asset.decimals, price)}`} inline />
          )}
        </Title>
        <ValueRoot len={getValueLen(valueStr)}>
          <Value text={valueStr} />
          <Text className={symbolClassName} text={`zk${asset.symbol}`} />
          {pendingTxs > 0 && (
            <PendingTxsTooltip trigger={<Dot size="xs" color="yellow" />}>
              <Text
                text={`${pendingValue >= 0 ? '+' : ''}${fromBaseUnits(pendingValue, asset.decimals)} zk${asset.symbol}`}
                size="xs"
                nowrap
              />
              <Text text={`from ${pendingTxs} pending transaction${pendingTxs > 1 ? 's' : ''}`} size="xs" nowrap />
            </PendingTxsTooltip>
          )}
        </ValueRoot>
      </ColContent>
      <ColButton>
        <Button theme="white" text={buttonText} onClick={onClick} size="l" outlined />
      </ColButton>
    </GradientBlock>
  );
};
