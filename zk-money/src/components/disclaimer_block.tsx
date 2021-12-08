import React from 'react';
import styled from 'styled-components';
import warningIcon from '../images/warning.svg';
import { Text } from './text';
import { borderRadiuses, breakpoints, spacings, Theme, themeColours } from '../styles';
import { Asset, fromBaseUnits } from '../app';

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

const WarningTitle = styled(Text)`
  display: none;

  @media (max-width: ${breakpoints.s}) {
    display: block;
    flex: 1;
    padding-right: ${spacings.m};
  }
`;

const WarningIcon = styled.img`
  height: 60px;

  @media (max-width: ${breakpoints.s}) {
    height: 40px;
  }
`;

const WarningFootnote = styled(Text)`
  @media (max-width: ${breakpoints.s}) {
    display: none;
  }
`;

interface DisclaimerBlockProps {
  assetState: { asset: Asset; txAmountLimit: bigint };
}

export const DisclaimerBlock: React.FunctionComponent<DisclaimerBlockProps> = ({ assetState }) => {
  return (
    <Root>
      <ColIcon>
        <WarningTitle text="Use at your own risk" size="m" weight="bold" />
        <WarningIcon src={warningIcon} />
      </ColIcon>
      <ColContent>
        <Text size="s">
          {`This is experimental software that hasn’t been externally audited yet. For security, amounts are capped at ${fromBaseUnits(
            assetState.txAmountLimit,
            assetState.asset.decimals,
          )} ${assetState.asset.symbol}. `}
          <WarningFootnote text="Use at your own risk." weight="bold" inline />
        </Text>
      </ColContent>
    </Root>
  );
};
