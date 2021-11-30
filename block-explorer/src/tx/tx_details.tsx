import BN from 'bn.js';
import React from 'react';
import styled from 'styled-components';
import {
  BlockSummary,
  InfoRow,
  InfoValuePlaceholder,
  HashValue,
  Timestamp,
  HashValuePlaceholder,
  Value,
} from '../block_summary';
import { ProofData, ProofDataPlaceholder } from '../proof_data';
import { proofIdToType, ProofTypeTag } from '../proof_type';
import { DetailsSection } from '../template';
import { Tx } from './query';

const formatNumber = (num: string) => num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const StyledProofTypeTag = styled(ProofTypeTag)`
  position: absolute;
  right: 0;
`;

export const TxDetailsPlaceholder: React.FunctionComponent = () => {
  const summaryPlaceholder = (
    <BlockSummary title="Transaction">
      <InfoRow title="TRANSACTION NUMBER">
        <InfoValuePlaceholder style={{ width: '40px' }} />
      </InfoRow>
      <InfoRow title="TIMESTAMP">
        <InfoValuePlaceholder style={{ width: '50%' }} />
      </InfoRow>
      <InfoRow title="NULLIFIERS">
        <HashValuePlaceholder />
        <HashValuePlaceholder />
      </InfoRow>
      <InfoRow title="DATA ENTRIES">
        <HashValuePlaceholder />
        <HashValuePlaceholder />
      </InfoRow>
    </BlockSummary>
  );

  return <DetailsSection lhsContent={summaryPlaceholder} rhsContent={<ProofDataPlaceholder />} />;
};

interface TxDetailsProps {
  tx: Tx;
}

export const TxDetails: React.FunctionComponent<TxDetailsProps> = ({ tx }) => {
  const {
    id,
    proofId,
    proofData,
    newNote1,
    newNote2,
    nullifier1,
    nullifier2,
    publicInput,
    inputOwner,
    publicOutput,
    outputOwner,
    block,
  } = tx;
  const created = block?.created;
  const proofType = proofIdToType(proofId);
  const statusTag = <StyledProofTypeTag proofType={proofType} />;

  const proofProperties = [];
  let proofDataHeight = 384;
  switch (proofType) {
    case 'JOIN_SPLIT': {
      const publicInputBn = new BN(publicInput, 16);
      proofProperties.push(
        <InfoRow key="public_input" title="PUBLIC INPUT">
          <Value text={`${formatNumber(publicInputBn.toString())}`} monospace />
          <HashValue value={`0x${inputOwner}`} />
        </InfoRow>,
      );
      proofDataHeight += 96;

      const publicOutputBn = new BN(publicOutput, 16);
      proofProperties.push(
        <InfoRow key="public_output" title="PUBLIC OUTPUT">
          <Value text={`${formatNumber(publicOutputBn.toString())}`} monospace />
          <HashValue value={`0x${outputOwner}`} />
        </InfoRow>,
      );
      proofDataHeight += 96;
      break;
    }
    case 'ACCOUNT':
      proofProperties.push(
        <InfoRow key="account_id" title="ACCOUNT ID">
          <HashValue value={`0x${publicInput}${publicOutput}`} />
        </InfoRow>,
      );
      proofDataHeight += 72;
      break;
    default:
  }

  const summaryNode = (
    <BlockSummary title="Transaction" titleContent={statusTag}>
      <InfoRow title="TRANSACTION ID">
        <HashValue value={`0x${id}`} />
      </InfoRow>
      <InfoRow title="TIMESTAMP">{created ? <Timestamp time={created} /> : 'Pending...'}</InfoRow>
      <InfoRow title="NULLIFIERS">
        <HashValue value={`0x${nullifier1}`} />
        <HashValue value={`0x${nullifier2}`} />
      </InfoRow>
      <InfoRow title="DATA ENTRIES">
        <HashValue value={`0x${newNote1}`} />
        <HashValue value={`0x${newNote2}`} />
      </InfoRow>
      {proofProperties}
    </BlockSummary>
  );

  const proofNode = <ProofData proofData={`0x${proofData}`} height={proofDataHeight} />;

  return <DetailsSection lhsContent={summaryNode} rhsContent={proofNode} />;
};
