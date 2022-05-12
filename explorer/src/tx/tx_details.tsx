import { ProofId } from '@aztec/sdk';
import React from 'react';
import styled from 'styled-components';
import { BlockSummary, InfoRow, HashValue, Timestamp } from '../block_summary';
import { ProofData } from '../proof_data';
import { ProofTypeTag } from '../proof_type';
import { DetailsSection } from '../template';
import { AccountDetails } from './account_details';
import { DepositDetails } from './deposit_details';
import { Tx } from './query';
import { WithdrawDetails } from './withdraw_detail';
import { DefiDepositDetails } from './defi_deposit_details';

const StyledProofTypeTag = styled(ProofTypeTag)`
  position: absolute;
  right: 0;
`;

function renderTypedTxDetails(tx: Tx) {
  switch (tx.proofId) {
    case ProofId.ACCOUNT:
      return <AccountDetails tx={tx} />;
    case ProofId.DEPOSIT:
      return <DepositDetails tx={tx} />;
    case ProofId.WITHDRAW:
      return <WithdrawDetails tx={tx} />;
    case ProofId.DEFI_DEPOSIT:
      return <DefiDepositDetails tx={tx} />;
    default:
      return <></>;
  }
}

interface TxDetailsProps {
  tx: Tx;
}

export const TxDetails: React.FunctionComponent<TxDetailsProps> = ({ tx }) => {
  const { id, proofId, newNote1, newNote2, nullifier1, nullifier2, block } = tx;

  const created = block?.created;
  const statusTag = <StyledProofTypeTag proofId={proofId} />;

  const summaryNode = (
    <BlockSummary title="Transaction" titleContent={statusTag}>
      <InfoRow title="TIMESTAMP">{created ? <Timestamp time={created} /> : 'Pending...'}</InfoRow>
      {renderTypedTxDetails(tx)}
      <InfoRow title="NULLIFIERS">
        <HashValue value={`0x${nullifier1}`} />
        <HashValue value={`0x${nullifier2}`} />
      </InfoRow>
      <InfoRow title="DATA ENTRIES">
        <HashValue value={`0x${newNote1}`} />
        <HashValue value={`0x${newNote2}`} />
      </InfoRow>
      <InfoRow title="TRANSACTION ID">
        <HashValue value={`0x${id}`} />
      </InfoRow>
    </BlockSummary>
  );

  const proofNode = <ProofData proofData={`0x${tx.proofData}`} />;

  return <DetailsSection lhsContent={summaryNode} rhsContent={proofNode} />;
};
