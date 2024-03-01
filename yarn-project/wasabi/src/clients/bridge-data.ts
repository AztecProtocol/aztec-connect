import { EthAddress, AssetValue } from '@aztec/sdk';

export interface UnderlyingAsset {
  address: EthAddress;
  name: string;
  symbol: string;
  decimals: number;
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
  uint24,
  uint32,
  uint64,
  boolean,
  string,
  bytes,
}

export interface AztecAsset {
  id: number;
  assetType: AztecAssetType;
  erc20Address: EthAddress;
}

export interface AuxDataConfig {
  start: number;
  length: number;
  description: string;
  solidityType: SolidityType;
}

export interface BridgeDataFieldGetters {
  /**
   * @dev This function should be implemented for stateful bridges
   * @param interactionNonce A globally unique identifier of a given DeFi interaction
   * @param inputValue User's input value
   * @return The value of the user's share of a given interaction
   */
  getInteractionPresentValue?(interactionNonce: number, inputValue: bigint): Promise<AssetValue[]>;

  /**
   * @dev This function should be implemented for all bridges that use auxData which require on-chain data
   * @param inputAssetA A struct detailing the first input asset
   * @param inputAssetB A struct detailing the second input asset
   * @param outputAssetA A struct detailing the first output asset
   * @param outputAssetB A struct detailing the second output asset
   * @return The set of possible auxData values that they can use for a given set of input and output assets
   */
  getAuxData?(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
  ): Promise<bigint[]>;

  /**
   * @dev This public variable defines the structure of the auxData
   */
  auxDataConfig: AuxDataConfig[];

  /**
   * @dev This function should be implemented for all bridges
   * @param inputAssetA A struct detailing the first input asset
   * @param inputAssetB A struct detailing the second input asset
   * @param outputAssetA A struct detailing the first output asset
   * @param outputAssetB A struct detailing the second output asset
   * @param auxData Arbitrary data to be passed into the bridge contract (slippage / nftID etc)
   * @param inputValue Amount of inputAssetA (and inputAssetB if used) provided on input
   * @return The expected return amounts of outputAssetA and outputAssetB
   */
  getExpectedOutput(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    inputValue: bigint,
  ): Promise<bigint[]>;

  /**
   * @dev This function should be implemented for async bridges
   * @param interactionNonce A globally unique identifier of a given DeFi interaction
   * @return The date at which the bridge is expected to be finalised (for limit orders this should be the expiration)
   */
  getExpiration?(interactionNonce: number): Promise<bigint>;

  /**
   * @dev This function should be implemented for async bridges
   * @param interactionNonce A globally unique identifier of a given DeFi interaction
   * @return A boolean indicating whether the interaction has been finalised
   */
  hasFinalised?(interactionNonce: number): Promise<boolean>;

  /**
   * @notice This function computes annual percentage return (APR) for a given asset
   * @dev This function should be implemented for all bridges which work with yield-bearing assets
   * @param yieldAsset A struct detailing the yield asset (e.g. cToken, wstETH, aETH, ...)
   * @return The expected APR (e.g. for Lido the return value would currently be 3.9)
   */
  getAPR?(yieldAsset: AztecAsset): Promise<number>;

  /**
   * @notice This function computes market size
   * @dev Should be implemented for all bridges dealing with L1 liquidity
   * @param inputAssetA A struct detailing the first input asset
   * @param inputAssetB A struct detailing the second input asset
   * @param outputAssetA A struct detailing the first output asset
   * @param outputAssetB A struct detailing the second output asset
   * @param auxData Arbitrary data to be passed into the bridge contract (slippage / nftID etc)
   * @return L1 liquidity this bridge call will be interacting with (e.g. the liquidity of the underlying yield pool
   *       or AMM, amount of ETH staked in Lido etc.)
   */
  getMarketSize?(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
  ): Promise<AssetValue[]>;

  /**
   * @notice This function computes annual percentage return (APR) for a given interaction
   * @dev This function should be implemented for all async yield bridges
   * @param interactionNonce A globally unique identifier of a given DeFi interaction
   * @return APR based on the information of a given interaction (e.g. token amounts after finalisation etc.)
   */
  getInteractionAPR?(interactionNonce: number): Promise<number[]>;

  /**
   * @notice This function gets the underlying amount for wrapped assets or shares
   * @param asset The wrapped asset
   * @param amount The amount of wrapped asset
   * @return The underlying asset (address, name, symbol, decimals, amount)
   */
  getUnderlyingAmount?(asset: AztecAsset, amount: bigint): Promise<UnderlyingAsset>;

  // Used only in Element, TODO: remove once clients get refactored to not share 1 class
  getTermAPR?(underlying: AztecAsset, auxData: bigint, inputValue: bigint): Promise<number>;

  // The following 3 functions are only used in Liquity's TroveBridge
  getBorrowingFee?(borrowAmount: bigint): Promise<bigint>;
  getCurrentCR?(): Promise<bigint>;
  getUserDebtAndCollateral?(tbAmount: bigint): Promise<[bigint, bigint]>;

  // Used in TroveBridge client
  getCustomMaxPrice?(slippage: bigint): Promise<bigint>;
}
