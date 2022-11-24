import { EthAddress, EthereumProvider, AssetValue } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import {
  IPriceFeed__factory,
  ITroveManager,
  ITroveManager__factory,
  TroveBridge,
  TroveBridge__factory,
} from '../../typechain-types/index.js';
import { createWeb3Provider } from '../aztec/provider/web3_provider.js';
import { AuxDataConfig, AztecAsset, AztecAssetType, BridgeDataFieldGetters, SolidityType } from '../bridge-data.js';

export class TroveBridgeData implements BridgeDataFieldGetters {
  public readonly LUSD = EthAddress.fromString('0x5f98805A4E8be255a32880FDeC7F6728C6568bA0');
  private price?: BigNumber;

  protected constructor(
    protected ethersProvider: Web3Provider,
    protected bridge: TroveBridge,
    protected troveManager: ITroveManager,
  ) {}

  /**
   * @param provider Ethereum provider
   * @param bridgeAddress Address of the bridge address (and the corresponding accounting token)
   */
  static create(provider: EthereumProvider, bridgeAddress: EthAddress) {
    const ethersProvider = createWeb3Provider(provider);
    const troveManager = ITroveManager__factory.connect('0xA39739EF8b0231DbFA0DcdA07d7e29faAbCf4bb2', ethersProvider);
    const bridge = TroveBridge__factory.connect(bridgeAddress.toString(), ethersProvider);
    return new TroveBridgeData(ethersProvider, bridge, troveManager);
  }

  auxDataConfig: AuxDataConfig[] = [
    {
      start: 0,
      length: 64,
      solidityType: SolidityType.uint64,
      description: 'AuxData is only used when borrowing and represent max borrowing fee',
    },
  ];

  /**
   * @return Borrowing rate rounded up to tenths of percents when the input/output asset combination corresponds
   *         to borrowing. Returns 0 for non-borrowing flows.
   */
  async getAuxData(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
  ): Promise<bigint[]> {
    if (
      inputAssetA.assetType === AztecAssetType.ETH &&
      inputAssetB.assetType === AztecAssetType.NOT_USED &&
      outputAssetA.erc20Address.equals(EthAddress.fromString(this.bridge.address)) &&
      outputAssetB.erc20Address.equals(this.LUSD)
    ) {
      const currentBorrowingRate = await this.troveManager.getBorrowingRateWithDecay();
      // Borrowing rate is decaying to a value defined by governance --> this means the value is changing
      // --> we don't want to break aggregation by there occurring irrelevant borrowing rate changes
      // so I will set the irrelevant decimals to 0 and increase the acceptable fee by 0.1 %
      const borrowingRate = (currentBorrowingRate.toBigInt() / 10n ** 15n) * 10n ** 15n + 10n ** 15n;
      return [borrowingRate];
    }
    return [0n];
  }

  async getExpectedOutput(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    inputValue: bigint,
  ): Promise<bigint[]> {
    const bridge = TroveBridge__factory.connect(this.bridge.address, this.ethersProvider);
    if (
      inputAssetA.assetType === AztecAssetType.ETH &&
      inputAssetB.assetType === AztecAssetType.NOT_USED &&
      outputAssetA.erc20Address.equals(EthAddress.fromString(this.bridge.address)) &&
      outputAssetB.erc20Address.equals(this.LUSD)
    ) {
      const amountOut = await bridge.callStatic.computeAmtToBorrow(inputValue);
      // Borrowing
      // Note: returning dummy value on index 0 because the frontend doesn't care about it
      return [0n, amountOut.toBigInt()];
    } else if (
      inputAssetA.erc20Address.equals(EthAddress.fromString(this.bridge.address)) &&
      outputAssetA.assetType === AztecAssetType.ETH
    ) {
      // Repaying
      const tbTotalSupply = await bridge.totalSupply();

      const { debt, coll } = await this.troveManager.getEntireDebtAndColl(this.bridge.address);

      if (inputAssetB.erc20Address.equals(this.LUSD)) {
        const collateralToWithdraw = (inputValue * coll.toBigInt()) / tbTotalSupply.toBigInt();
        if (outputAssetB.erc20Address.equals(this.LUSD)) {
          const debtToRepay = (inputValue * debt.toBigInt()) / tbTotalSupply.toBigInt();
          const lusdReturned = inputValue - debtToRepay;
          return [collateralToWithdraw, lusdReturned];
        } else if (outputAssetB.erc20Address.equals(EthAddress.fromString(this.bridge.address))) {
          // Repaying after redistribution flow
          // Note: this code assumes the flash swap doesn't fail (if it would fail some tb would get returned)
          return [collateralToWithdraw, 0n];
        }
      } else if (
        inputAssetB.assetType === AztecAssetType.NOT_USED &&
        outputAssetB.assetType === AztecAssetType.NOT_USED
      ) {
        // Redeeming
        // Fetching bridge's ETH balance because it's possible the collateral was already claimed
        const ethHeldByBridge = (await this.ethersProvider.getBalance(this.bridge.address)).toBigInt();
        const collateralToWithdraw = (inputValue * (coll.toBigInt() + ethHeldByBridge)) / tbTotalSupply.toBigInt();
        return [collateralToWithdraw, 0n];
      }
    }
    throw new Error('Incorrect combination of input/output assets.');
  }

  async getMarketSize(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
  ): Promise<AssetValue[]> {
    const { coll } = await this.troveManager.getEntireDebtAndColl(this.bridge.address);
    return [
      {
        assetId: 0,
        value: coll.toBigInt(),
      },
    ];
  }

  /**
   * @notice This function computes borrowing fee for a given borrow amount
   * @param borrowAmount An amount of LUSD borrowed
   * @return amount of fee to be paid for a given borrow amount (in LUSD)
   */
  async getBorrowingFee(borrowAmount: bigint): Promise<bigint> {
    const isRecoveryMode = await this.troveManager.checkRecoveryMode(await this.fetchPrice());
    if (isRecoveryMode) {
      return 0n;
    }

    const borrowingRate = await this.troveManager.getBorrowingRateWithDecay();
    return (borrowingRate.toBigInt() * borrowAmount) / 10n ** 18n;
  }

  /**
   * @notice Returns current collateral ratio of the bridge
   * @return Current collateral ratio of the bridge denominated in percents
   */
  async getCurrentCR(): Promise<bigint> {
    const cr = await this.troveManager.getCurrentICR(this.bridge.address, await this.fetchPrice());
    return cr.toBigInt() / 10n ** 16n;
  }

  /**
   * @notice Returns debt and collateral corresponding to a given accounting token amount (TB token)
   * @return Debt corresponding to a given accounting token amount
   * @return Collateral corresponding to a given accounting token amount
   */
  async getUserDebtAndCollateral(tbAmount: bigint): Promise<[bigint, bigint]> {
    const tbTotalSupply = await this.bridge.totalSupply();

    const { debt, coll } = await this.troveManager.getEntireDebtAndColl(this.bridge.address);

    const userDebt = (tbAmount * debt.toBigInt()) / tbTotalSupply.toBigInt();
    const userCollateral = (tbAmount * coll.toBigInt()) / tbTotalSupply.toBigInt();

    return [userDebt, userCollateral];
  }

  private async fetchPrice(): Promise<BigNumber> {
    if (this.price === undefined) {
      const priceFeedAddress = await this.troveManager.priceFeed();
      const priceFeed = IPriceFeed__factory.connect(priceFeedAddress, this.ethersProvider);
      this.price = await priceFeed.callStatic.fetchPrice();
    }

    return this.price;
  }
}
