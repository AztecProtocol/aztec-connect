import type { Provider } from '@ethersproject/providers';
import { KNOWN_MAINNET_ASSET_ADDRESS_STRS as S } from '../known_assets/known_asset_addresses.js';
import { BigNumber, Contract } from 'ethers';
import { UnderlyingAmountPollerCache } from '../../alt-model/defi/bridge_data_adaptors/caches/underlying_amount_poller_cache.js';
import { ChainLinkPollerCache } from './chain_link_poller_cache.js';
import { getUsdOracleAddressForAsset } from './chain_link_oracles.js';
import { Poller } from '../../app/util/poller.js';
import { createGatedSetter_noArrows, Obs } from '../../app/util/index.js';
import { ExpectedOutputPollerCache } from '../defi/bridge_data_adaptors/caches/expected_output_poller_cache.js';
import { AuxDataOptionsPollerCache } from '../defi/bridge_data_adaptors/caches/aux_data_options_poller_cache.js';

function createWstEthPriceObs(provider: Provider, chainLinkPollerCache: ChainLinkPollerCache) {
  const stETHOracleAddress = getUsdOracleAddressForAsset(S.stETH);
  if (!stETHOracleAddress) return;
  const stETHPricePoller = chainLinkPollerCache.get(stETHOracleAddress);
  if (!stETHPricePoller) return;

  const wstETHContract = new Contract(
    S.wstETH,
    ['function getStETHByWstETH(uint256) public view returns(uint256)'],
    provider,
  );
  const oneUnitBigNum = BigNumber.from((10n ** 18n).toString());
  const pollStETHByWstETH = Obs.constant(async () => {
    const wstEthToStEthBigNum = await wstETHContract.getStETHByWstETH(oneUnitBigNum);
    return wstEthToStEthBigNum.toBigInt() as bigint;
  });
  const stETHByWstETHPoller = new Poller(pollStETHByWstETH, 1000 * 60 * 10, undefined);
  return Obs.combine([stETHPricePoller.obs, stETHByWstETHPoller.obs]).map(([stETH_price, stETH_by_wstETH]) => {
    if (stETH_price === undefined) return undefined;
    if (stETH_by_wstETH === undefined) return undefined;
    // 1 stETH = stETHPrice USD
    // 1 wstETH = wstEthToStEth stETH
    // 1 wstETH = stETHPrice * wstEthToStEth
    return (stETH_price * stETH_by_wstETH) / 10n ** 18n;
  });
}

export type PriceObs = Obs<bigint | undefined>;

function createConvertedAssetPriceObs(
  convertedAssetUnitPriceObs: PriceObs | undefined,
  conversionValueObs: PriceObs | undefined,
  unitAssetValue: bigint,
) {
  if (!conversionValueObs) return;
  if (!convertedAssetUnitPriceObs) return;
  return Obs.combine([conversionValueObs, convertedAssetUnitPriceObs]).map(
    ([conversionValue, underlyingAssetPrice]) => {
      if (conversionValue === undefined) return undefined;
      if (underlyingAssetPrice === undefined) return undefined;
      return (underlyingAssetPrice * conversionValue) / unitAssetValue;
    },
  );
}

function getChainLinkPriceObs(assetAddressStr: string, chainLinkPollerCache: ChainLinkPollerCache) {
  const oracleAddress = getUsdOracleAddressForAsset(assetAddressStr);
  if (!oracleAddress) return;
  return chainLinkPollerCache.get(oracleAddress).obs;
}

function createIcEthPriceObs(
  expectedOutputPollerCache: ExpectedOutputPollerCache,
  auxDataOptionsPollerCache: AuxDataOptionsPollerCache,
  getPriceFeedObs: (assetAddressStr: string) => PriceObs | undefined,
) {
  const auxDataOptsPoller = auxDataOptionsPollerCache.get(['set-uniswap.ETH-to-icETH', true]);
  const unitAssetValue = 10n ** 18n;
  // Note that unlike the other price obs this emitter-based implementation is
  // will only ever evaluate once. We compromise on this because it's currently
  // more effort than it's worth to implement Obs unwrapping inside an Obs.
  const outputValueObs = Obs.emitter<bigint | undefined>(emit => {
    const gatedSetter = createGatedSetter_noArrows(emit);
    const getAndEmitOutputValue = async () => {
      const opts = await auxDataOptsPoller?.obs.whenDefined();
      if (!opts) return;
      const auxData = opts[0];
      const expectedOutputPoller = expectedOutputPollerCache.get([
        'set-uniswap.ETH-to-icETH',
        auxData,
        unitAssetValue,
        'exit',
      ]);
      const output = await expectedOutputPoller?.obs.whenDefined();
      emit(output?.outputValueA.value);
    };
    getAndEmitOutputValue();
    return gatedSetter.close;
  }, undefined);
  return createConvertedAssetPriceObs(getPriceFeedObs(S.Eth), outputValueObs, unitAssetValue);
}

export function createAssetPriceObs(
  addressStr: string,
  provider: Provider,
  chainLinkPollerCache: ChainLinkPollerCache,
  underlyingAmountPollerCache: UnderlyingAmountPollerCache,
  expectedOutputPollerCache: ExpectedOutputPollerCache,
  auxDataOptionsPollerCache: AuxDataOptionsPollerCache,
  getPriceFeedObs: (assetAddressStr: string) => PriceObs | undefined,
): PriceObs | undefined {
  const boundCreateUnderlyingAssetPriceObs = (underlyingAssetAddressStr: string, recipeId: string, decimals = 18) => {
    const unitAssetValue = 10n ** BigInt(decimals);
    const unitUnderlyingAssetValuePoller = underlyingAmountPollerCache.get([recipeId, unitAssetValue]);
    return createConvertedAssetPriceObs(
      getPriceFeedObs(underlyingAssetAddressStr),
      unitUnderlyingAssetValuePoller?.obs.map(x => x?.amount),
      unitAssetValue,
    );
  };
  switch (addressStr) {
    case S.yvDAI:
      return boundCreateUnderlyingAssetPriceObs(S.DAI, 'yearn-finance.DAI-to-yvDAI');
    case S.yvWETH:
      return boundCreateUnderlyingAssetPriceObs(S.WETH, 'yearn-finance.ETH-to-yvETH');
    case S.weWETH:
      return boundCreateUnderlyingAssetPriceObs(S.WETH, 'euler.ETH-to-weETH');
    case S.weDAI:
      return boundCreateUnderlyingAssetPriceObs(S.DAI, 'euler.DAI-to-weDAI');
    case S.wewstETH:
      return boundCreateUnderlyingAssetPriceObs(S.wstETH, 'euler.wstETH-to-wewstETH');
    case S.wa2WETH:
      return boundCreateUnderlyingAssetPriceObs(S.WETH, 'aave.ETH-to-wa2ETH');
    case S.wa2DAI:
      return boundCreateUnderlyingAssetPriceObs(S.DAI, 'aave.DAI-to-wa2DAI');
    case S.wcDAI:
      return boundCreateUnderlyingAssetPriceObs(S.DAI, 'compound.DAI-to-weETH');
    case S.wstETH:
      return createWstEthPriceObs(provider, chainLinkPollerCache);
    case S.icETH:
      return createIcEthPriceObs(expectedOutputPollerCache, auxDataOptionsPollerCache, getPriceFeedObs);
    default:
      return getChainLinkPriceObs(addressStr, chainLinkPollerCache);
  }
}
