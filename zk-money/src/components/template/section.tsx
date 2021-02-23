import React from 'react';
import styled from 'styled-components';
import { breakpoints, spacings, fontSizes, lineHeights } from '../../styles';
import { Text } from '../text';

const Root = styled.div`
  padding: ${spacings.m} 0;
`;

const SectionTitle = styled(Text)`
  padding: ${spacings.m} 0;
  letter-spacing: 3px;

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.s} 0;
    font-size: ${fontSizes.m};
    line-height: ${lineHeights.m};
  }
`;

const SectionContent = styled.div`
  padding: ${spacings.m} 0;

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.s} 0;
  }
`;

interface SectionProps {
  className?: string;
  title: React.ReactNode;
  children: React.ReactNode;
}

export const Sections = styled.div`
  margin-top: -${parseInt(spacings.m) * 2}px;
`;

export const Section: React.FunctionComponent<SectionProps> = ({ className, title, children }) => (
  <Root className={className}>
    <SectionTitle size="l" weight="semibold">
      {title}
    </SectionTitle>
    <SectionContent>{children}</SectionContent>
  </Root>
);
