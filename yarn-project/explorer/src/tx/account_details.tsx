import React from 'react';
import { OffchainAccountData } from '@aztec/sdk';
import { HashValue, InfoRow } from '../block_summary/index.js';
import { Tx } from './types.js';

export function AccountDetails({ tx }: { tx: Tx }) {
  const offchainAccountData = OffchainAccountData.fromBuffer(Buffer.from(tx.offchainTxData, 'hex'));
  return (
    <InfoRow title="ACCOUNT ID">
      <HashValue value={offchainAccountData.accountPublicKey.toString()} />
    </InfoRow>
  );
}
