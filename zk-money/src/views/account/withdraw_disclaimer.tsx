import React from 'react';
import styled from 'styled-components';
import invisibleIcon from '../../images/invisible.svg';
import { Text } from '../../components';
import { borderRadiuses, breakpoints, spacings, Theme, themeColours } from '../../styles';
import { AssetState, fromBaseUnits } from '../../app';

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

const PaddedTop = styled(Text)`
  padding-top: ${spacings.s};
`;

interface WithdrawDisclaimerProps {
  assetState: AssetState;
}

export const WithdrawDisclaimer: React.FunctionComponent<WithdrawDisclaimerProps> = ({
  assetState: { asset, withdrawSafeAmounts },
}) => (
  <Root>
    <ColIcon>
      <WarningTitle text="Security Advice" size="m" weight="bold" />
      <WarningIcon src={invisibleIcon} />
    </ColIcon>
    <ColContent>
      <Text size="s">
        {'Transfers to Ethereum address should sum to '}
        <Text
          text={`${withdrawSafeAmounts.map(a => fromBaseUnits(a, asset.decimals)).join(' or ')} zk${
            asset.symbol
          } inclusive of the fee`}
          weight="bold"
          inline
        />
        {' to achieve maximum privacy.'}
      </Text>
      <PaddedTop size="s">{'Sending different amounts will compromise privacy.'}</PaddedTop>
    </ColContent>
  </Root>
);
