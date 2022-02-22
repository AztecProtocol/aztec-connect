import React from 'react';
import styled from 'styled-components';
import { BlockSummary, InfoRow, HashValue, Timestamp } from '../block_summary';
import { ProofData } from '../proof_data';
import { proofIdToType, ProofType, ProofTypeTag } from '../proof_type';
import { DetailsSection } from '../template';
import { AccountDetails } from './account_details';
import { getTransactionType, parseRawProofData } from './helpers';
import { JoinSplitDetails } from './join_split_details';
import { Tx } from './query';

const StyledProofTypeTag = styled(ProofTypeTag)`
  position: absolute;
  right: 0;
`;
interface TxDetailsProps {
  tx: Tx;
}

export const TxDetails: React.FunctionComponent<TxDetailsProps> = ({ tx }) => {
  const { id, proofId, newNote1, newNote2, nullifier1, nullifier2, block } = tx;
  const { asset, inputOwner, outputOwner, publicOutput, publicInput } = parseRawProofData(
    Buffer.from(tx.proofData, 'hex'),
  );

  const created = block?.created;
  const proofType = proofIdToType(proofId);
  const statusTag = <StyledProofTypeTag proofType={proofType} />;

  let proofDataHeight = 384;
  let transactionType;
  let transactionDetails;

  if (proofType === ProofType.JOIN_SPLIT) {
    proofDataHeight += 192;
    transactionType = getTransactionType(publicInput, publicOutput);
    transactionDetails = (
      <JoinSplitDetails
        transactionType={transactionType}
        asset={asset}
        inputOwner={inputOwner}
        outputOwner={outputOwner}
        publicOutput={publicOutput}
        publicInput={publicInput}
      />
    );
  } else if (proofType === ProofType.ACCOUNT) {
    proofDataHeight += 72;
    transactionDetails = <AccountDetails publicOutput={publicOutput} publicInput={publicInput} />;
  }

  const summaryNode = (
    <BlockSummary title="Transaction" subtitle={transactionType} titleContent={statusTag}>
      <InfoRow title="TIMESTAMP">{created ? <Timestamp time={created} /> : 'Pending...'}</InfoRow>
      {transactionDetails}
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

  const proofNode = <ProofData proofData={`0x${tx.proofData}`} height={proofDataHeight} />;

  return <DetailsSection lhsContent={summaryNode} rhsContent={proofNode} />;
};
