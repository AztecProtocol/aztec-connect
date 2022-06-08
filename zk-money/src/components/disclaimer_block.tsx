import React from 'react';
import styled from 'styled-components/macro';
import warningIcon from '../images/warning.svg';
import { Text } from './text';
import { borderRadiuses, breakpoints, spacings, Theme, themeColours } from '../styles';
import { TextLink } from './text_link';

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

export const DisclaimerBlock: React.FunctionComponent = () => {
  return (
    <Root>
      <ColIcon>
        <WarningTitle text="Use at your own risk" size="m" weight="bold" />
        <WarningIcon src={warningIcon} />
      </ColIcon>
      <ColContent>
        <Text size="s">
          This is experimental software. Use at your own risk. Learn more about our approach to security{' '}
          <TextLink
            inline
            href="https://medium.com/aztec-protocol/layer-by-layer-a-guide-to-aztecs-security-approach-87df087093c0"
            target="_blank"
            underline
            color="white"
          >
            here
          </TextLink>
          .
        </Text>
      </ColContent>
    </Root>
  );
};
