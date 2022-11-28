import { AssetValue, toBaseUnits } from '@aztec/sdk';
import { getAssetPreferredFractionalDigits } from '../known_assets/known_asset_display_data.js';
import { RemoteAsset } from '../types.js';
import { baseUnitsToFloat, convertToBulkPrice, formatBaseUnits } from '../../app/index.js';

export class Amount {
  constructor(readonly baseUnits: bigint, readonly info: RemoteAsset) {}

  get id() {
    return this.info.id;
  }

  get address() {
    return this.info.address;
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

  format(opts?: { layer?: 'L1' | 'L2'; uniform?: boolean; showPlus?: boolean; hideSymbol?: boolean }) {
    const layer = opts?.layer ?? 'L2';
    const symbolPrefix = layer === 'L2' ? 'zk' : '';
    const hideSymbol = opts?.hideSymbol;
    const numStr = formatBaseUnits(this.baseUnits, this.info.decimals, {
      precision: opts?.uniform ? getAssetPreferredFractionalDigits(this.info.label) : undefined,
      commaSeparated: opts?.uniform,
      showPlus: opts?.showPlus,
    });
    const symbol = `${symbolPrefix}${this.info.symbol}`;
    return `${numStr} ${hideSymbol ? '' : symbol}`;
  }

  toBulkPrice(assetUnitPrice: bigint) {
    return convertToBulkPrice(this.baseUnits, this.info.decimals, assetUnitPrice);
  }
}
