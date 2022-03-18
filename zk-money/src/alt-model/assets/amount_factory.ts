import type { AssetValue } from '@aztec/sdk';
import type { RemoteAsset } from 'alt-model/types';
import { Amount } from './amount';

export class AmountFactory {
  constructor(private readonly remoteAssets: RemoteAsset[]) {}

  fromAssetValue(assetValue: AssetValue) {
    const info = this.remoteAssets.find(x => x.id === assetValue.assetId);
    if (info) return new Amount(assetValue.value, info);
  }

  from(assetId: number, value: number | string) {
    const info = this.remoteAssets.find(x => x.id === assetId);
    if (info) return Amount.from(value, info);
  }
}
