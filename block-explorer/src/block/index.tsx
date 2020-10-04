import React from 'react';
import { useQuery } from 'react-apollo';
import styled from 'styled-components';
import { BlockStatusIndicator } from '../block_status';
import { Button, Text } from '../components';
import { breakpoints, spacings } from '../styles';
import { Sections, Section, SectionTitle } from '../template';
import { TxList } from '../tx_list';
import { BlockDetails, BlockDetailsPlaceholder, getEtherscanLink } from './block_details';
import { GET_BLOCK, BLOCK_POLL_INTERVAL, BlockQueryData, BlockQueryVars } from './query';

const BlockTitle = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const StyledSectionTitle = styled(SectionTitle)`
  @media (max-width: ${breakpoints.xs}) {
    flex-wrap: wrap;
  }
`;

const TxListTitleRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacings.l} 0 ${spacings.m};
  font-size: 26px;
  line-height: 1.5;
  letter-spacing: 1px;
`;

const StatusLink = styled.a`
  margin-left: auto;
`;

const StyledBlockStatusIndicator = styled(BlockStatusIndicator)`
  padding-left: ${spacings.s};
  margin-top: ${spacings.s};
  margin-bottom: ${spacings.xs};
  margin-left: auto;

  @media (max-width: ${breakpoints.s}) {
    margin-bottom: ${spacings.xxs};
  }
`;

const BackButtonRoot = styled.div`
  display: flex;
  padding: ${spacings.xl} 0;
`;

interface BlockProps {
  id: number;
}

export const Block: React.FunctionComponent<BlockProps> = ({ id }) => {
  const { loading, error, data, stopPolling } = useQuery<BlockQueryData, BlockQueryVars>(GET_BLOCK, {
    variables: { id },
    pollInterval: BLOCK_POLL_INTERVAL,
  });

  if (data?.block?.status === 'SETTLED') {
    stopPolling();
  }

  const blockTitle = (
    <StyledSectionTitle
      breadcrumbs={[
        {
          text: 'Network Stats',
          to: '/',
        },
        {
          text: `Block ${id}`,
          highlight: true,
        },
      ]}
    />
  );

  if (loading || !data) {
    return (
      <Sections>
        <Section title={blockTitle}>
          <BlockDetailsPlaceholder />
        </Section>
      </Sections>
    );
  }

  if (error) {
    return <div>Error</div>;
  }

  const { block } = data;

  if (!block) {
    return (
      <Sections>
        <Section title={blockTitle}>
          <Text text={`Block not found.`} weight="light" />
          <BackButtonRoot>
            <Button text="Back to Network Stats" to="/" />
          </BackButtonRoot>
        </Section>
      </Sections>
    );
  }

  const { status, ethTxHash } = block;

  const statusIndicator = <StyledBlockStatusIndicator status={status} size="s" />;

  const titleNode = (
    <BlockTitle>
      <>{blockTitle}</>
      {!!ethTxHash && (
        <StatusLink href={getEtherscanLink(ethTxHash)} target="_blank">
          {statusIndicator}
        </StatusLink>
      )}
      {!ethTxHash && statusIndicator}
    </BlockTitle>
  );

  return (
    <Sections>
      <Section title={titleNode}>
        <BlockDetails block={block} />
        <TxListTitleRoot>
          <Text text="Transactions" weight="semibold" />
          <Text text={`${block.txs.length}`} />
        </TxListTitleRoot>
        <TxList txs={block.txs} />
      </Section>
    </Sections>
  );
};
