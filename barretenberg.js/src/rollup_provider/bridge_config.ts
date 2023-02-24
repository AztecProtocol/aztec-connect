export interface BridgeConfig {
  bridgeAddressId: number;
  numTxs: number;
  // The total amount of gas the bridge is expected to use, from which we compute the fees.
  // e.g. The gas for a single tx is gas / numTxs. This can then be converted to a fee in whichever asset.
  gas?: number;
  permittedAssets: number[];
}

export interface BridgeConfigJson {
  bridgeAddressId: number;
  numTxs: number;
  gas?: number;
  permittedAssets: number[];
}
