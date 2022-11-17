import React, { useEffect, useState } from 'react';
import { default as styled } from 'styled-components';
import { default as useFetch } from 'use-http';
import { BlockStatusIndicator, getBlockStatus } from '../block_status/index.js';
import { Button, Text } from '../components/index.js';
import { breakpoints, spacings } from '../styles/index.js';
import { Sections, Section, SectionTitle } from '../template/index.js';
import { Tx as TxInterface } from './types.js';
import { TxDetailsPlaceholder } from './tx_details_placeholder.js';
import { TxDetails } from './tx_details.js';
import { POLL_INTERVAL } from '../config.js';

const TxTitle = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const StyledSectionTitle = styled(SectionTitle)`
  @media (max-width: ${breakpoints.xs}) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const StyledBlockStatusIndicator = styled(BlockStatusIndicator)`
  padding-left: ${spacings.s};
  margin-top: ${spacings.s};
  margin-bottom: ${spacings.xs};
  margin-left: auto;

  @media (max-width: ${breakpoints.m}) {
    margin-bottom: ${spacings.xxs};
  }
`;

const BackButtonRoot = styled.div`
  display: flex;
  padding: ${spacings.xl} 0;
`;

interface TxProps {
  id: string;
}

export const Tx: React.FunctionComponent<TxProps> = ({ id }) => {
  const [tx, setTx] = useState<TxInterface>();

  const { get, response, loading, error } = useFetch();

  const fetchTx = async (txId: string) => {
    const res = await get(`/tx/${txId ?? id}`);
    if (response.ok) setTx(res);
  };

  // init
  useEffect(() => {
    fetchTx(id).catch(() => `Error fetching tx details: ${id}`);
  }, []);

  useEffect(() => {
    let interval: number | null = null;
    if (!tx?.block?.mined) {
      interval = window.setInterval(() => fetchTx(id), POLL_INTERVAL);
    }

    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [tx]);

  const breadcrumbs = [
    {
      text: 'Network Stats',
      to: '/',
    },
    {
      text: tx?.block ? `Block ${tx.block.id}` : 'Block',
      to: tx?.block ? `/block/${tx.block.id}` : undefined,
    },
    {
      text: `0x${id.slice(0, 8)}...`,
      highlight: true,
    },
  ];

  const txTitleNode = <StyledSectionTitle breadcrumbs={breadcrumbs} />;

  if (loading || !tx) {
    return (
      <Sections>
        <Section title={txTitleNode}>
          <TxDetailsPlaceholder />
        </Section>
      </Sections>
    );
  }

  if (error) {
    return (
      <Sections>
        <Section title={txTitleNode}>
          <Text text="Connecting to rollup server..." size="m" weight="light" />
        </Section>
      </Sections>
    );
  }

  if (!tx) {
    return (
      <Sections>
        <Section title={txTitleNode}>
          <Text text={`Transaction not found.`} size="m" weight="light" />
          <Text text={`0x${id}`} size="s" weight="light" monospace />
          <BackButtonRoot>
            <Button text="Back to Network Stats" to="/" />
          </BackButtonRoot>
        </Section>
      </Sections>
    );
  }

  const status = getBlockStatus(tx.block);

  const titleNode = (
    <TxTitle>
      {txTitleNode}
      {status && <StyledBlockStatusIndicator status={status} size="s" />}
    </TxTitle>
  );

  return (
    <Sections>
      <Section title={titleNode}>
        <TxDetails tx={tx} />
      </Section>
    </Sections>
  );
};
