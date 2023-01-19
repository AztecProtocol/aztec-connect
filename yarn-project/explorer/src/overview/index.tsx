import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { default as useFetch } from 'use-http';
import { default as styled } from 'styled-components';

import { Blocks } from '../blocks/index.js';
import blobIcon from '../images/blob.svg';
import { NetworkStats } from '../network_stats/index.js';
import { NetworkStatsQueryData } from '../network_stats/types.js';
import { SearchBar } from '../search_bar/index.js';
import { breakpoints, spacings } from '../styles/index.js';
import { Sections, Section } from '../template/index.js';
import { POLL_INTERVAL } from '../config.js';

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
  const [status, setStatus] = useState<NetworkStatsQueryData>();

  const urlQuery = new URLSearchParams(useLocation().search);
  const page = +(urlQuery.get('p') || 1);

  const { get, response, loading, error } = useFetch();

  const fetchStatus = async () => {
    const data = await get('/status');
    if (response.ok) setStatus(data);
  };

  // initialize
  useEffect(() => {
    fetchStatus().catch(() => console.log('Error fetching stats'));
  }, []);

  useEffect(() => {
    let interval: number | null = null;
    if (page === 1) {
      interval = window.setInterval(fetchStatus, POLL_INTERVAL);
    }
    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [page]);

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
        <NetworkStats status={status} loading={loading} error={!!error} />
      </StyledSection>
      <StyledSection title={blocksTitleNode}>
        <Blocks status={status} page={page} loading={loading} error={!!error} />
      </StyledSection>
      <Blob src={blobIcon} />
    </StyledSections>
  );
};
