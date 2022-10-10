import React from 'react';
import { OffchainDefiDepositData } from '@aztec/sdk';
import { InfoRow, Value } from './../block_summary/index.js';
import { Tx } from './query.js';
import { formatAsset, getAssetIcon, getBridgeProtocolName } from './helpers.js';
import { useAsset } from '../context.js';

export function DefiDepositDetails({ tx }: { tx: Tx }) {
  const onchainDefiDepositData = OffchainDefiDepositData.fromBuffer(Buffer.from(tx.offchainTxData, 'hex'));
  const { bridgeCallData, depositValue } = onchainDefiDepositData;
  const asset = useAsset(bridgeCallData.inputAssetIdA);
  const assetIcon = getAssetIcon(asset);
  const protocolName = getBridgeProtocolName(bridgeCallData.bridgeAddressId);
  return (
    <>
      <InfoRow title="BRIDGE ADDRESS ID">
        <Value text={bridgeCallData.bridgeAddressId.toString()} monospace />
      </InfoRow>
      {protocolName && (
        <InfoRow title="PROTOCOL">
          <Value text={protocolName} />
        </InfoRow>
      )}
      <InfoRow title="AMOUNT">
        <Value icon={assetIcon} text={formatAsset(asset, depositValue)} monospace />
      </InfoRow>
    </>
  );
}
