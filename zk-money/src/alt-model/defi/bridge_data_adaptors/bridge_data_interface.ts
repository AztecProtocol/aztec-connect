export interface AssetValue {
  assetId: bigint; // the Aztec AssetId (this can be queried from the rollup contract)
  amount: bigint;
}
export enum AztecAssetType {
  ETH,
  ERC20,
  VIRTUAL,
  NOT_USED,
}
export enum SolidityType {
  uint8,
  uint16,
  uint32,
  uint64,
  boolean,
  string,
  bytes,
}
export interface AztecAsset {
  id: bigint;
  assetType: AztecAssetType;
  erc20Address: string;
}
export interface AuxDataConfig {
  start: number;
  length: number;
  description: string;
  solidityType: SolidityType;
}
export interface BridgeData {
  /*
    @dev This function should be implemented for stateful bridges. It’s purpose is to tell the developer using the bridge the value of a given interaction.
    @dev The value should be returned as an array of AssetValue’s
    */
  getInteractionPresentValue(interactionNonce: bigint): Promise<AssetValue[]>;
  /*
    @dev This function should be implemented for all bridges that use auxData that require onchain data. It’s purpose is to tell the developer using the bridge
    @dev the set of possible auxData’s that they can use for a given set of inputOutputAssets.
    */
  getAuxData(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
  ): Promise<bigint[]>;
  /*
    @dev This public variable defines the structure of the auxData
    */
  auxDataConfig: AuxDataConfig[];
  /*
    @dev This function should be implemented for all bridges. It should return the expected value in of the bridgeId given an inputValue
    @dev given inputValue of inputAssetA and inputAssetB
    */
  getExpectedOutput(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    inputValue: bigint,
  ): Promise<bigint[]>;
}
export interface AsyncBridgeData extends BridgeData {
  /*
    @dev This function should be implemented for async bridges. It should return the date at which the bridge is expected to be finalised.
    @dev For limit orders this should be the expiration.
    */
  getExpiration(interactionNonce: bigint): Promise<bigint>;
  hasFinalised(interactionNonce: bigint): Promise<Boolean>;
}
export interface YieldBridgeData extends BridgeData {
  /*
    @dev This function should be implemented for all bridges are stateful. It should return the expected value 1 year from now of outputAssetA and outputAssetB
    @dev given inputValue of inputAssetA and inputAssetB
    */
  getExpectedYearlyOuput(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    inputValue: bigint,
  ): Promise<bigint[]>;
  /*
    @dev This function should be implemented for all bridges. It should return the Layer liquidity this bridge call will be interacting with
    @dev e.g the liquidity of the underlying yield pool or AMM for a given pair
    */
  getMarketSize(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
  ): Promise<AssetValue[]>;
}
export interface AsyncYieldBridgeData extends YieldBridgeData, AsyncBridgeData {}
