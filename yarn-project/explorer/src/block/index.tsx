import React, { useEffect, useState } from 'react';
import { default as styled } from 'styled-components';
import { DecodedBlock, ProofId } from '@aztec/sdk';

import { BlockStatusIndicator, getBlockStatus } from '../block_status/index.js';
import { Button, Text } from '../components/index.js';
import { NetworkContext, RollupProviderContext } from '../context.js';
import { breakpoints, spacings } from '../styles/index.js';
import { Sections, Section, SectionTitle } from '../template/index.js';
import { TxList } from '../tx_list/index.js';
import { BlockDetails, BlockDetailsPlaceholder, getEtherscanLink } from './block_details.js';
import { Block as BlockInterface } from './types.js';

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

interface BlockPageProps {
  id: number;
}

export const formatServerBlock = (block: DecodedBlock): BlockInterface => {
  return {
    id: block.rollupId,
    mined: block.minedTime,
    dataRoot: block.newDataRoot.toString('hex'),
    nullifierRoot: block.newNullRoot.toString('hex'),
    hash: block.rollupHash.toString('hex'),
    ethTxHash: block.ethTxHash.toString(),
    proofData: block.rawProofData.toString('hex'),
    txs: block.innerProofData
      .filter(({ proofId }) => proofId !== ProofId.PADDING)
      .map(innerProof => ({
        proofId: innerProof.proofId,
        id: innerProof.txId.toString('hex'),
      })),
  };
};

export const BlockPage: React.FunctionComponent<BlockPageProps> = ({ id }) => {
  const [blockData, setBlockData] = useState<BlockInterface | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any | null>(null);

  const rollupProvider = React.useContext(RollupProviderContext);

  const fetchBlock = async () => {
    setLoading(true);
    try {
      const blocks = await rollupProvider.getBlocks(id, 1);
      setLoading(false);
      setBlockData(formatServerBlock(new DecodedBlock(blocks[0])));
    } catch (err) {
      setLoading(false);
      setError(err);
    }
  };

  useEffect(() => {
    if (!loading && !blockData) {
      fetchBlock().catch(() => console.log('Error fetching block'));
    }
  }, [loading, blockData]);

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

  if (loading || !blockData) {
    return (
      <Sections>
        <Section title={blockTitle}>
          <BlockDetailsPlaceholder />
        </Section>
      </Sections>
    );
  }

  if (error) {
    console.log(error);
    return (
      <Sections>
        <Section title={blockTitle}>
          <Text text="Connecting to rollup server..." weight="light" />
        </Section>
      </Sections>
    );
  }

  if (!blockData) {
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

  const { ethTxHash } = blockData;
  const status = getBlockStatus(blockData);
  const statusIndicator = <StyledBlockStatusIndicator status={status} size="s" />;

  return (
    <NetworkContext.Consumer>
      {network => {
        const titleNode = (
          <BlockTitle>
            <>{blockTitle}</>
            {!!ethTxHash && (
              <StatusLink href={getEtherscanLink(network, ethTxHash)} target="_blank">
                {statusIndicator}
              </StatusLink>
            )}
            {!ethTxHash && statusIndicator}
          </BlockTitle>
        );

        return (
          <Sections>
            <Section title={titleNode}>
              <BlockDetails block={blockData} network={network} />
              <TxListTitleRoot>
                <Text text="Transactions" weight="semibold" />
                <Text text={`${blockData.txs.length}`} />
              </TxListTitleRoot>
              <TxList txs={blockData.txs} />
            </Section>
          </Sections>
        );
      }}
    </NetworkContext.Consumer>
  );
};
