import React, { useEffect } from 'react';
import { useQuery } from 'react-apollo';
import styled from 'styled-components';
import { BlockStatusIndicator, getBlockStatus } from '../block_status';
import { Button, Text } from '../components';
import { breakpoints, spacings } from '../styles';
import { Sections, Section, SectionTitle } from '../template';
import { GET_TX, TX_POLL_INTERVAL, TxQueryData, TxQueryVars } from './query';
import { TxDetailsPlaceholder } from './tx_details_placeholder';
import { TxDetails } from './tx_details';

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
  const { loading, error, data, stopPolling, startPolling } = useQuery<TxQueryData, TxQueryVars>(GET_TX, {
    variables: { id },
  });

  useEffect(() => {
    if (!data?.tx?.block?.mined) {
      startPolling(TX_POLL_INTERVAL);
    }

    return () => {
      stopPolling();
    };
  }, [data, startPolling, stopPolling]);

  const breadcrumbs = [
    {
      text: 'Network Stats',
      to: '/',
    },
    {
      text: data?.tx?.block ? `Block ${data.tx.block.id}` : 'Block',
      to: data?.tx?.block ? `/block/${data.tx.block.id}` : undefined,
    },
    {
      text: `0x${id.slice(0, 8)}...`,
      highlight: true,
    },
  ];

  const txTitleNode = <StyledSectionTitle breadcrumbs={breadcrumbs} />;

  if (loading || !data) {
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

  const { tx } = data;

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
