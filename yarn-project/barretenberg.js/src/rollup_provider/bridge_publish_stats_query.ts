export interface BridgePublishQuery {
  periodSeconds: number;
  bridgeAddressId: number;
  inputAssetIdA?: number;
  inputAssetIdB?: number;
  outputAssetIdA?: number;
  outputAssetIdB?: number;
  auxData?: bigint;
}

export interface BridgePublishQueryResult {
  query: BridgePublishQuery;
  averageTimeout: number; // Average time period between bridge interactions, in seconds
  averageGasPerHour: number;
}

export interface BridgePublishQueryJson {
  periodSeconds: number;
  bridgeAddressId: number;
  inputAssetIdA?: number;
  inputAssetIdB?: number;
  outputAssetIdA?: number;
  outputAssetIdB?: number;
  auxData?: string;
}

export interface BridgePublishQueryResultJson {
  query: BridgePublishQueryJson;
  averageTimeout: number;
  averageGasPerHour: number;
}

export const bridgePublishQueryToJson = ({ auxData, ...query }: BridgePublishQuery): BridgePublishQueryJson => {
  return {
    ...query,
    auxData: auxData?.toString(),
  };
};

export const bridgePublishQueryFromJson = ({ auxData, ...query }: BridgePublishQueryJson): BridgePublishQuery => {
  return {
    ...query,
    auxData: auxData ? BigInt(auxData) : undefined,
  };
};

export const bridgePublishQueryResultToJson = ({
  query,
  ...result
}: BridgePublishQueryResult): BridgePublishQueryResultJson => {
  return {
    ...result,
    query: bridgePublishQueryToJson(query),
  };
};

export const bridgePublshQueryResultFromJson = ({
  query,
  ...result
}: BridgePublishQueryResultJson): BridgePublishQueryResult => {
  return {
    ...result,
    query: bridgePublishQueryFromJson(query),
  };
};
