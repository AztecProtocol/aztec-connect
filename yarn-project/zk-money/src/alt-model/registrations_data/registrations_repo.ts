import { BlockchainAsset, BlockchainBridge, EthAddress } from '@aztec/sdk';
import { RemoteAsset } from '../types.js';
import { registrationsDataRaw } from './registrations_data_raw.js';
import createDebug from 'debug';
import {
  RegisteredAssetLabel,
  RegisteredBridgeLabel,
  RegistrationsDataRawAssets,
  RegistrationsDataRawBridges,
} from './registrations_data_types.js';
import { AssetLabel } from '../known_assets/known_asset_display_data.js';
import { KNOWN_MAINNET_ASSET_ADDRESS_STRS } from '../known_assets/known_asset_addresses.js';

const debug = createDebug('zm:registrations_data');

export class RegistrationsRepo {
  readonly remoteAssets: RemoteAsset[] = [];
  private labelledRemoteAssets: Record<string, RemoteAsset | undefined> = {};
  private labelledBridges: Record<string, BlockchainBridge | undefined> = {};
  private assetAddressStrToLabel: Record<string, AssetLabel>;

  constructor(deployTag: string, blockchainAssets: BlockchainAsset[], blockchainBridges: BlockchainBridge[]) {
    if (!(deployTag in registrationsDataRaw)) {
      debug(`Unrecognised deployTag: ${deployTag}`);
    }
    const labelToAssetAddressStr = {
      ...KNOWN_MAINNET_ASSET_ADDRESS_STRS,
      ...(registrationsDataRaw[deployTag].assets as RegistrationsDataRawAssets),
    };
    this.assetAddressStrToLabel = Object.fromEntries(
      Object.entries(labelToAssetAddressStr).map(([k, v]) => [v, k as AssetLabel]),
    );

    const getAssetLabel = (address: EthAddress): RegisteredAssetLabel | undefined => {
      const addressStr = address.toString();
      if (!labelToAssetAddressStr) {
        // Provide at least 'Eth' label as fallback
        if (address.equals(EthAddress.ZERO)) return 'Eth';
        return;
      }
      return Object.entries(labelToAssetAddressStr).find(x => x[1] === addressStr)?.[0] as
        | RegisteredAssetLabel
        | undefined;
    };

    for (let idx = 0; idx < blockchainAssets.length; idx++) {
      const blockchainAsset = blockchainAssets[idx];
      const remoteAsset: RemoteAsset = {
        id: idx,
        address: blockchainAsset.address,
        decimals: blockchainAsset.decimals,
        symbol: blockchainAsset.symbol,
        name: blockchainAsset.name,
        label: getAssetLabel(blockchainAsset.address),
      };
      this.remoteAssets.push(remoteAsset);
      if (remoteAsset.label) this.labelledRemoteAssets[remoteAsset.label] = remoteAsset;
    }

    for (const assetLabel in labelToAssetAddressStr) {
      if (!(assetLabel in this.labelledRemoteAssets)) {
        debug(`Missing asset: ${assetLabel}`);
      }
    }

    const bridgesRaw: RegistrationsDataRawBridges | undefined = registrationsDataRaw[deployTag].bridges;
    for (const k in bridgesRaw) {
      const bridgeLabel = k as RegisteredBridgeLabel;
      const bridgeAddressId = bridgesRaw[bridgeLabel];
      const bridge = blockchainBridges.find(x => x.id === bridgeAddressId);
      if (bridge) {
        this.labelledBridges[bridgeLabel] = bridge;
      } else {
        debug(`Missing bridge: ${bridgeLabel}`);
      }
    }
  }

  getRemoteAssetByLabel(label: RegisteredAssetLabel) {
    return this.labelledRemoteAssets[label];
  }

  getLabelForAssetAddress(address: EthAddress) {
    return this.assetAddressStrToLabel[address.toString()];
  }

  getBridgeByLabel(label: RegisteredBridgeLabel) {
    return this.labelledBridges[label];
  }
}
