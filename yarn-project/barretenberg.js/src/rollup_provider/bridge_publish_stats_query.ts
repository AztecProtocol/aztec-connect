export interface BridgePublishQuery {
  periodSeconds: number;
  bridgeAddressId: number;
  inputAssetIdA?: number;
  inputAssetIdB?: number;
  outputAssetIdA?: number;
  outputAssetIdB?: number;
  auxData?: number;
}

export interface BridgePublishQueryResult {
  query: BridgePublishQuery;
  averageTimeout: number;
  averageGasPerHour: number;
}
