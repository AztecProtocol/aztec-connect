import BN from 'bn.js';
import React from 'react';
import styled from 'styled-components';
import daiIcon from '../images/dai.svg';
import ethIcon from '../images/ethereum_white.svg';
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
import { proofIdToType, ProofType, ProofTypeTag, TransactionType } from '../proof_type';
import { DetailsSection } from '../template';
import { parseRawProofData } from './helpers';
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

interface JoinSplitTransactionDetailsProps {
  tx: Tx;
}

export const TxDetails: React.FunctionComponent<TxDetailsProps> = ({ tx }) => {
  const { id, publicInput, publicOutput, proofId, proofData, newNote1, newNote2, nullifier1, nullifier2, block } = tx;
  const created = block?.created;
  const proofType = proofIdToType(proofId);
  const statusTag = <StyledProofTypeTag proofType={proofType} />;

  // this number is very odd
  let proofDataHeight = 384;
  let parsedData, transactionType;

  const parsedProofData = parseRawProofData(Buffer.from(tx.proofData, 'hex'));
  console.log(tx, parsedProofData);

  const proofDataBuffer = Buffer.from(tx.proofData, 'utf-8');
  if (proofType === ProofType.JOIN_SPLIT) {
    transactionType = getTransactionType(publicInput, publicOutput);
    // parsedData = JoinSplitProofData.fromBuffer(proofDataBuffer);
    // console.log(parsedData);
    // console.log(parsedData.txFee);
    proofDataHeight += 192;
    // parsedData.txFee returns gibberish?
    // console.log({ tx, d: new BN(parsedData?.proofData.txFee, 32).toString() });
  } else if (proofType === ProofType.ACCOUNT) {
    // this throws "Error: Not an account proof"
    // parsedData = AccountProofData.fromBuffer(proofDataBuffer);
    proofDataHeight += 72;
  }

  const summaryNode = (
    <BlockSummary title="Transaction" subtitle={transactionType} titleContent={statusTag}>
      <InfoRow title="TIMESTAMP">{created ? <Timestamp time={created} /> : 'Pending...'}</InfoRow>
      <InfoRow title="AMOUNT">
        <Value icon={daiIcon} text={`1 DAI`} monospace />
      </InfoRow>
      <InfoRow title="TRANSACTION FEE">
        <Value icon={ethIcon} text={`0.1 ETH`} monospace />
      </InfoRow>
      <InfoRow title="L1 RECIPIENT">
        <HashValue value={`0x${nullifier1}`} />
      </InfoRow>
      <InfoRow title="NULLIFIERS">
        <HashValue value={`0x${nullifier1}`} />
        <HashValue value={`0x${nullifier2}`} />
      </InfoRow>
      <InfoRow title="DATA ENTRIES">
        <HashValue value={`0x${newNote1}`} />
        <HashValue value={`0x${newNote2}`} />
      </InfoRow>
      {proofType === ProofType.JOIN_SPLIT && <JoinSplitTransaction tx={tx} />}
      {proofType === ProofType.ACCOUNT && <AccountTransaction tx={tx} />}
      {/* <InfoRow title="TX FEE">
        <Value text={`0`} monospace />
      </InfoRow> */}

      <InfoRow title="TRANSACTION ID">
        <HashValue value={`0x${id}`} />
      </InfoRow>
    </BlockSummary>
  );

  const proofNode = <ProofData proofData={`0x${proofData}`} height={proofDataHeight} />;

  return <DetailsSection lhsContent={summaryNode} rhsContent={proofNode} />;
};

const getTransactionType = (publicInput: string, publicOutput: string): TransactionType => {
  const zeroBn = new BN(0);
  const publicInputBn = new BN(publicInput, 16);
  const publicOutputBn = new BN(publicOutput, 16);

  // this is only true for join splits,
  // as account txs repurpose publicInput and publicOutput values
  const isShield = publicInputBn.cmp(zeroBn) === 1;
  const isWithdraw = publicOutputBn.cmp(zeroBn) === 1;

  if (isShield) {
    return TransactionType.SHIELD;
  } else if (isWithdraw) {
    return TransactionType.WITHDRAW;
  }
  return TransactionType.PRIVATE_SEND;
};

const JoinSplitTransaction = ({ tx }: JoinSplitTransactionDetailsProps) => {
  const { inputOwner, outputOwner, publicInput, publicOutput } = tx;

  /*
    * gibberish?
    txFee: bigint; Fee Paid in Asset ID

    inputOwner: Buffer; L1 Address that shielded (need to trim to 20bytes) -> ethscan link
    outputOwner: Buffer; -> ethscan link

    L1 that received publicOutput (need to trim to 20bytes)
    proofId: ProofId; | Account Tx or JoinSplit
    assetId: Buffer; 0 = ETH, 1 = DAI, 2 = renBTC
  */

  return <></>;
};

const AccountTransaction = ({ tx }: any) => {
  const { publicInput, publicOutput } = tx;

  return (
    <InfoRow key="account_id" title="ACCOUNT ID">
      <HashValue value={`0x${publicInput}${publicOutput}`} />
    </InfoRow>
  );
};
