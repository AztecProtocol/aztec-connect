import React from 'react';
import { EthAddress, InnerProofData, toBigIntBE } from '@aztec/sdk';
import { HashValue, InfoRow, Value } from './../block_summary/index.js';
import { assetIdFromBuffer, formatAsset, getAssetIcon } from './helpers.js';
import { Tx } from './query.js';
import { useAsset } from '../context.js';

export function DepositDetails({ tx }: { tx: Tx }) {
  const innerProofData = InnerProofData.fromBuffer(Buffer.from(tx.proofData, 'hex'));
  const assetId = assetIdFromBuffer(innerProofData.publicAssetId);
  const asset = useAsset(assetId);
  const assetIcon = getAssetIcon(asset);
  const publicValue = toBigIntBE(innerProofData.publicValue);
  const publicOwner = new EthAddress(innerProofData.publicOwner);
  return (
    <>
      <InfoRow title="AMOUNT">
        <Value icon={assetIcon} text={formatAsset(asset, publicValue)} monospace />
      </InfoRow>
      <InfoRow title="SENT FROM">
        <HashValue value={publicOwner.toString()} />
      </InfoRow>
    </>
  );
}
