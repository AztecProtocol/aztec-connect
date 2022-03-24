import React from 'react';
import styled from 'styled-components';
import { Blocks } from '../blocks';
import blobIcon from '../images/blob.svg';
import { NetworkStats } from '../network_stats';
import { SearchBar } from '../search_bar';
import { breakpoints, spacings } from '../styles';
import { Sections, Section } from '../template';

const StyledSections = styled(Sections)`
  position: relative;
`;

const StyledSection = styled(Section)`
  position: relative;
  z-index: 1;
`;

const BlocksTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: ${breakpoints.xs}) {
    flex-wrap: wrap;
  }
`;

const SearchBarCol = styled.div`
  width: 50%;
  line-height: 0;

  @media (max-width: ${breakpoints.s}) {
    width: 70%;
  }

  @media (max-width: ${breakpoints.xs}) {
    margin-top: ${spacings.m};
    width: 100%;
  }
`;

const Blob = styled.img`
  position: absolute;
  width: 600px;
  bottom: -240px;
  left: -136px;
  transform: rotate(120deg);
  opacity: 0.5;
  pointer-events: none;

  @media (max-width: ${breakpoints.m}) {
    width: 480px;
    left: -116px;
  }

  @media (max-width: ${breakpoints.s}) {
    width: 400px;
    bottom: -200px;
  }

  @media (max-width: ${breakpoints.xs}) {
    width: 300px;
    bottom: -148px;
    left: -80px;
    transform: rotate(132deg);
  }
`;

export const Overview: React.FunctionComponent = () => {
  const blocksTitleNode = (
    <BlocksTitle>
      <>{'Latest Blocks'}</>
      <SearchBarCol>
        <SearchBar />
      </SearchBarCol>
    </BlocksTitle>
  );

  return (
    <StyledSections>
      <StyledSection title="Network Stats">
        <NetworkStats />
      </StyledSection>
      <StyledSection title={blocksTitleNode}>
        <Blocks />
      </StyledSection>
      <Blob src={blobIcon} />
    </StyledSections>
  );
};
