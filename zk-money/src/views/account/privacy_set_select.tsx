import React from 'react';
import styled from 'styled-components';
import { Asset, fromBaseUnits } from '../../app';
import { Button, Text, Tooltip } from '../../components';
import invisibleIcon from '../../images/invisible.svg';
import visibleIcon from '../../images/visible.svg';
import warningIcon from '../../images/error_white.svg';
import { borderRadiuses, breakpoints, spacings, Theme, themeColours } from '../../styles';

const concatValues = (values: string[]) =>
  [
    values.slice(0, -1).join(', '),
    values.length > 2 ? ',' : '',
    values.length > 1 ? ` or ${values[values.length - 1]}` : '',
  ].join('');

const Root = styled.div`
  display: flex;
  align-items: center;
  padding: ${spacings.m} ${spacings.s};
  border: 1px solid ${themeColours[Theme.WHITE].border};
  border-radius: ${borderRadiuses.m};

  @media (max-width: ${breakpoints.s}) {
    flex-direction: column;
  }
`;

const ColIcon = styled.div`
  display: flex;
  align-items: center;
  padding: 0 ${spacings.s};
  flex-shrink: 0;

  @media (max-width: ${breakpoints.s}) {
    width: 100%;
    padding-bottom: ${spacings.s};
  }
`;

const ColContent = styled.div`
  padding: 0 ${spacings.s};
  flex: 1;
`;

const Title = styled(Text)`
  display: none;

  @media (max-width: ${breakpoints.s}) {
    display: block;
    flex: 1;
    padding-right: ${spacings.m};
  }
`;

const VisibilityIcon = styled.img`
  width: 60px;

  @media (max-width: ${breakpoints.s}) {
    width: 40px;
  }
`;

const AmountButtonRoots = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin: ${spacings.xs} -${spacings.xs};
`;

const AmountButton = styled(Button)`
  margin: ${spacings.xs} ${spacings.xs};
`;

const WarningIcon = styled.img`
  margin-right: ${spacings.xs};
  height: 16px;
`;

interface PrivacySetSelectProps {
  asset: Asset;
  values: bigint[];
  value: bigint;
  onSelect(value: bigint): void;
}

export const PrivacySetSelect: React.FunctionComponent<PrivacySetSelectProps> = ({
  asset,
  values,
  value,
  onSelect,
}) => (
  <Root>
    <ColIcon>
      <Title text="Security Advice" size="m" weight="bold" />
      <VisibilityIcon src={value ? invisibleIcon : visibleIcon} />
    </ColIcon>
    <ColContent>
      <Text size="s">
        {'Transfers to Ethereum address should sum to '}
        <Text
          text={`${concatValues(values.map(v => fromBaseUnits(v, asset.decimals)))} zk${
            asset.symbol
          } inclusive of the fee`}
          weight="bold"
          inline
        />
        {' to achieve maximum privacy. Sending different amounts will compromise privacy.'}
      </Text>
      <AmountButtonRoots>
        {values.map(v => (
          <AmountButton
            key={`${v}`}
            theme="gradient"
            size="s"
            text={`${fromBaseUnits(v, asset.decimals)} zk${asset.symbol}`}
            onClick={() => onSelect(v)}
            outlined={v !== value}
          />
        ))}
        <Tooltip
          trigger={
            <AmountButton theme="gradient" size="s" onClick={() => onSelect(0n)} outlined={!!value}>
              {!value && <WarningIcon src={warningIcon} />}
              {'Other'}
            </AmountButton>
          }
        >
          <Text text="Sending other amounts may compromise privacy." size="xxs" nowrap />
        </Tooltip>
      </AmountButtonRoots>
    </ColContent>
  </Root>
);
