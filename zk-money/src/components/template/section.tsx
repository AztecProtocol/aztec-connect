import React from 'react';
import styled from 'styled-components';
import { breakpoints, spacings, fontSizes, lineHeights, fontWeights } from '../../styles';

const SectionRoot = styled.div`
  padding: ${spacings.m} 0;
`;

const SectionTitle = styled.div`
  padding: ${spacings.m} 0;
  font-size: ${fontSizes.l};
  line-height: ${lineHeights.l};
  font-weight: ${fontWeights.semibold};
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
  margin-top: calc(-${spacings.m} * 2);
`;

export const Section: React.FunctionComponent<SectionProps> = ({ className, title, children }) => {
  return (
    <SectionRoot className={className}>
      <SectionTitle>{title}</SectionTitle>
      <SectionContent>{children}</SectionContent>
    </SectionRoot>
  );
};
