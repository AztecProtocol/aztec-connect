export interface AssetValue {
  assetId: number;
  value: bigint;
}

export interface AssetValueJson {
  assetId: number;
  value: string;
}

export const assetValueToJson = (assetValue: AssetValue): AssetValueJson => ({
  ...assetValue,
  value: assetValue.value.toString(),
});

export const assetValueFromJson = (json: AssetValueJson): AssetValue => ({
  ...json,
  value: BigInt(json.value),
});

export const isVirtualAsset = (assetId: number) => assetId >= 1 << 29;
