import React from 'react';
import { HashValue, InfoRow } from '../block_summary';

interface AccountDetailsProps {
  publicInput: bigint;
  publicOutput: bigint;
}

export const AccountDetails = ({ publicInput, publicOutput }: AccountDetailsProps) => {
  return (
    <InfoRow key="account_id" title="ACCOUNT ID">
      <HashValue value={`0x${publicInput}${publicOutput}`} />
    </InfoRow>
  );
};
