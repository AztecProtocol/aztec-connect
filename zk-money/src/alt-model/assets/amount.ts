import { AssetValue, toBaseUnits } from '@aztec/sdk';
import { RemoteAsset } from 'alt-model/types';
import { baseUnitsToFloat, convertToPrice } from 'app';

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

  format() {
    return `${this.toFloat()} ${this.info.symbol}`;
  }

  toUsd(assetPrice: bigint) {
    return convertToPrice(this.baseUnits, this.info.decimals, assetPrice);
  }
}
