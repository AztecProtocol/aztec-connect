export enum AssetId {
  ETH,
  DAI,
  renBTC,
}

const enumValues = <T>(e: T): T[keyof T][] =>
  Object.keys(e)
    .filter(k => typeof e[k] === 'number')
    .map(k => e[k]);

export const AssetIds = enumValues(AssetId);

export interface AssetValue {
  assetId: AssetId;
  value: bigint;
}
