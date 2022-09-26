import type { Provider } from '@ethersproject/providers';
import { KNOWN_MAINNET_ASSET_ADDRESS_STRS as S } from '../known_assets/known_asset_addresses';
import { BigNumber, Contract } from 'ethers';
import { UnderlyingAmountPollerCache } from 'alt-model/defi/bridge_data_adaptors/caches/underlying_amount_poller_cache';
import { ChainLinkPollerCache } from './chain_link_poller_cache';
import { getUsdOracleAddressForAsset } from './chain_link_oracles';
import { Poller } from 'app/util/poller';
import { Obs } from 'app/util';

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

function createUnderlyingAssetPriceObs(
  underlyingAssetAddressStr: string,
  recipeId: string,
  decimals: number,
  chainLinkPollerCache: ChainLinkPollerCache,
  underlyingAmountPollerCache: UnderlyingAmountPollerCache,
) {
  const unitAssetValue = 10n ** BigInt(decimals);
  const unitUnderlyingAssetValuePoller = underlyingAmountPollerCache.get([recipeId, unitAssetValue]);
  const chainLinkPriceObs = getChainLinkPriceObs(underlyingAssetAddressStr, chainLinkPollerCache);
  if (!unitUnderlyingAssetValuePoller) return;
  if (!chainLinkPriceObs) return;
  return Obs.combine([unitUnderlyingAssetValuePoller.obs, chainLinkPriceObs]).map(
    ([unitUnderlyingAssetValue, chainlinkPrice]) => {
      if (!unitUnderlyingAssetValue) return undefined;
      if (chainlinkPrice === undefined) return undefined;
      return (chainlinkPrice * unitUnderlyingAssetValue.amount) / unitAssetValue;
    },
  );
}

function getChainLinkPriceObs(assetAddressStr: string, chainLinkPollerCache: ChainLinkPollerCache) {
  const oracleAddress = getUsdOracleAddressForAsset(assetAddressStr);
  if (!oracleAddress) return;
  return chainLinkPollerCache.get(oracleAddress).obs;
}

export function createAssetPriceObs(
  addressStr: string,
  provider: Provider,
  chainLinkPollerCache: ChainLinkPollerCache,
  underlyingAmountPollerCache: UnderlyingAmountPollerCache,
) {
  switch (addressStr) {
    case S.yvDAI:
      return createUnderlyingAssetPriceObs(
        S.DAI,
        'yearn-finance.DAI-to-yvDAI',
        18,
        chainLinkPollerCache,
        underlyingAmountPollerCache,
      );
    case S.yvETH:
      return createUnderlyingAssetPriceObs(
        S.wETH,
        'yearn-finance.ETH-to-yvETH',
        18,
        chainLinkPollerCache,
        underlyingAmountPollerCache,
      );
    case S.wstETH:
      return createWstEthPriceObs(provider, chainLinkPollerCache);
    default:
      return getChainLinkPriceObs(addressStr, chainLinkPollerCache);
  }
}
