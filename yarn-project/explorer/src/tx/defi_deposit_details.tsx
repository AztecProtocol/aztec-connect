import React, { useContext } from 'react';
import { BridgeCallData, OffchainDefiDepositData } from '@aztec/sdk';
import { HashValue, InfoRow, Value } from './../block_summary/index.js';
import { Tx } from './types.js';
import { formatAsset, getAssetIcon } from './helpers.js';
import { NetworkContext, useAsset } from '../context.js';
import { registrationsDataRaw } from './registrations_data_raw.js';
import { ACCEPTABLE_DEPLOY_TAGS } from '../config.js';

function getBridgeInteractionDescription(deployTag: string, bridgeCallData: BridgeCallData) {
  if (!ACCEPTABLE_DEPLOY_TAGS.includes(deployTag)) {
    return {
      bridgeName: `Bridge ${bridgeCallData.bridgeAddressId}`,
      inputAssetA: `asset ${bridgeCallData.inputAssetIdA}`,
      inputAssetB: bridgeCallData.inputAssetIdB ? `asset ${bridgeCallData.inputAssetIdB}` : null,
      outputAssetA: `asset ${bridgeCallData.outputAssetIdA}`,
      outputAssetB: bridgeCallData.outputAssetIdB ? `asset ${bridgeCallData.outputAssetIdB}` : null,
    };
  }

  const lookupData = registrationsDataRaw[deployTag];
  const bridges = lookupData['bridges'];
  // Reverse lookup the bridge name, inefficient, but works as set is small
  const reverseLookupBridges = Object.fromEntries(Object.entries(bridges).map(([k, v]) => [v, k]));
  const bridgeName = reverseLookupBridges[bridgeCallData.bridgeAddressId] || `Bridge ${bridgeCallData.bridgeAddressId}`;

  // cutoff name from last _ to remove gas suffix from name (e.g. _800K)
  const lastIndex = bridgeName.lastIndexOf('_');
  const bridgeNameWithoutGas = lastIndex > 0 ? bridgeName.substring(0, bridgeName.lastIndexOf('_')) : bridgeName;

  const inputAssetA = lookupData['assetList'][bridgeCallData.inputAssetIdA] || `$asset {bridgeCallData.inputAssetIdA}`;
  const inputAssetB = bridgeCallData.inputAssetIdB
    ? lookupData['assetList'][bridgeCallData.inputAssetIdB] || `asset ${bridgeCallData.inputAssetIdB}`
    : null;

  const outputAssetA =
    lookupData['assetList'][bridgeCallData.outputAssetIdA] || `asset ${bridgeCallData.outputAssetIdA}`;
  const outputAssetB = bridgeCallData.outputAssetIdB
    ? lookupData['assetList'][bridgeCallData.outputAssetIdB] || `asset ${bridgeCallData.outputAssetIdB}`
    : null;

  return {
    bridgeName: bridgeNameWithoutGas,
    inputAssetA,
    inputAssetB,
    outputAssetA,
    outputAssetB,
  };
}

export function DefiDepositDetails({ tx }: { tx: Tx }) {
  const network = useContext(NetworkContext);

  const onchainDefiDepositData = OffchainDefiDepositData.fromBuffer(Buffer.from(tx.offchainTxData, 'hex'));
  const { bridgeCallData, depositValue } = onchainDefiDepositData;
  const inputAssetA = useAsset(bridgeCallData.inputAssetIdA);
  const inputAssetB = bridgeCallData.inputAssetIdB ? useAsset(bridgeCallData.inputAssetIdB) : null;
  const assetIcon = getAssetIcon(inputAssetA);
  const details = getBridgeInteractionDescription(network.deployTag, bridgeCallData);

  return (
    <>
      <InfoRow title="BRIDGE CALLDATA">
        <HashValue value={bridgeCallData.toString()} />
      </InfoRow>
      <InfoRow title="INPUT AMOUNT">
        <Value
          icon={assetIcon}
          text={`${formatAsset(inputAssetA, depositValue)} ${
            inputAssetB ? ' and ' + formatAsset(inputAssetB, depositValue) : ''
          }`}
          monospace
        />
      </InfoRow>
      <InfoRow title="DESCRIPTION">
        <Value
          text={`Using ${details.bridgeName} to swap ${details.inputAssetA}${
            details.inputAssetB ? ' and ' + details.inputAssetB : ''
          } into ${details.outputAssetA}${details.outputAssetB ? ' and ' + details.outputAssetB : ''}`}
        />
      </InfoRow>
    </>
  );
}
