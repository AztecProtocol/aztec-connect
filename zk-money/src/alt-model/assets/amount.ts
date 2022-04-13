import { AssetValue, toBaseUnits } from '@aztec/sdk';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';
import { RemoteAsset } from 'alt-model/types';
import { baseUnitsToFloat, convertToBulkPrice, formatBaseUnits } from 'app';

export class Amount {
  constructor(readonly baseUnits: bigint, readonly info: RemoteAsset) {}

  get id() {
    return this.info.id;
  }

  get address() {
    return this.info.address;
  }

  get permitSupport() {
    // TODO
    return false;
  }

  toFloat() {
    return baseUnitsToFloat(this.baseUnits, this.info.decimals);
  }

  static from(value: number | string, info: RemoteAsset) {
    return new Amount(toBaseUnits(value.toString(), info.decimals), info);
  }

  toAssetValue(): AssetValue {
    return { assetId: this.id, value: this.baseUnits };
  }

  withBaseUnits(baseUnits: bigint) {
    return new Amount(baseUnits, this.info);
  }

  add(baseUnits: bigint) {
    return this.withBaseUnits(this.baseUnits + baseUnits);
  }

  format(opts?: { layer?: 'L1' | 'L2'; uniform?: boolean; showPlus?: boolean }) {
    const layer = opts?.layer ?? 'L2';
    const symbolPrefix = layer === 'L2' ? 'zk' : '';
    const numStr = formatBaseUnits(this.baseUnits, this.info.decimals, {
      precision: opts?.uniform ? getAssetPreferredFractionalDigits(this.info.address) : undefined,
      commaSeparated: opts?.uniform,
      showPlus: opts?.showPlus,
    });
    return `${numStr} ${symbolPrefix}${this.info.symbol}`;
  }

  toBulkPrice(assetUnitPrice: bigint) {
    return convertToBulkPrice(this.baseUnits, this.info.decimals, assetUnitPrice);
  }
}
