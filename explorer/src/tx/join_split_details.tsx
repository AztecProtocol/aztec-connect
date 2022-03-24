import React from 'react';
import { HashValue, InfoRow, Value } from '../block_summary';
import { TransactionType } from '../proof_type';
import { Asset, formatAsset } from './helpers';

interface JoinSplitDetailsProps {
  transactionType: TransactionType;
  asset: Asset;
  inputOwner: string;
  outputOwner: string;
  publicInput: bigint;
  publicOutput: bigint;
}

export const JoinSplitDetails = ({
  transactionType,
  asset,
  inputOwner,
  outputOwner,
  publicInput,
  publicOutput,
}: JoinSplitDetailsProps) => {
  if (transactionType === TransactionType.SHIELD) {
    return (
      <>
        <InfoRow title="AMOUNT">
          <Value icon={asset.icon} text={formatAsset(asset, publicInput)} monospace />
        </InfoRow>
        <InfoRow title="SENT FROM">
          <HashValue value={`0x${inputOwner}`} />
        </InfoRow>
      </>
    );
  } else if (transactionType === TransactionType.WITHDRAW) {
    return (
      <>
        <InfoRow title="AMOUNT">
          <Value icon={asset.icon} text={formatAsset(asset, publicOutput)} monospace />
        </InfoRow>
        <InfoRow title="SENT TO">
          <HashValue value={`0x${outputOwner}`} />
        </InfoRow>
      </>
    );
  }

  return null;
};
