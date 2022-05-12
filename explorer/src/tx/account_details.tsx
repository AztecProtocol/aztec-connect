import React from 'react';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { HashValue, InfoRow } from '../block_summary';
import { Tx } from './query';

export function AccountDetails({ tx }: { tx: Tx }) {
  const offchainAccountData = OffchainAccountData.fromBuffer(Buffer.from(tx.offchainTxData, 'hex'));
  return (
    <InfoRow title="ACCOUNT ID">
      <HashValue value={offchainAccountData.accountPublicKey.toString()} />
    </InfoRow>
  );
}
