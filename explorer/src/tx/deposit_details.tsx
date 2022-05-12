import React from 'react';
import { EthAddress } from '@aztec/sdk';
import { InnerProofData } from '@aztec/barretenberg/rollup_proof';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { HashValue, InfoRow, Value } from './../block_summary';
import { assetIdFromBuffer, formatAsset, getAssetIcon } from './helpers';
import { Tx } from './query';
import { useAsset } from '../context';

export function DepositDetails({ tx }: { tx: Tx }) {
  const innerProofData = InnerProofData.fromBuffer(Buffer.from(tx.proofData, 'hex'));
  const assetId = assetIdFromBuffer(innerProofData.assetId);
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
