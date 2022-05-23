import type { Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { EthAddress } from '@aztec/sdk';
import { KNOWN_MAINNET_ASSET_ADDRESS_STRS as S } from '../known_assets/known_asset_addresses';
import { BigNumber, Contract } from 'ethers';

const debug = createDebug('zm:price_fetchers');

function getAssetPriceFeedAddressStr(address: EthAddress) {
  switch (address.toString()) {
    case S.ETH:
      return '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';
    case S.DAI:
      return '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9';
    case S.renBTC:
      return '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c';
  }
}
const ABI = ['function latestAnswer() public view returns(int256)'];

function createDefaultPriceFetcher(priceFeedContractAddressStr: string, provider: Provider) {
  const contract = new Contract(priceFeedContractAddressStr, ABI, provider);
  return async () => {
    try {
      const bigNum = await contract.latestAnswer();
      return bigNum.toBigInt() as bigint;
    } catch (err) {
      debug(`Price fetch failed for address ${priceFeedContractAddressStr}`, err);
      throw err;
    }
  };
}

function createWstEthPriceFetcher(provider: Provider) {
  const stETHPriceFetcher = createDefaultPriceFetcher('0xcfe54b5cd566ab89272946f602d76ea879cab4a8', provider);
  if (!stETHPriceFetcher) return;

  const wstETHContract = new Contract(
    S.wstETH,
    ['function getStETHByWstETH(uint256) public view returns(uint256)'],
    provider,
  );
  return async () => {
    const stEthPrice = await stETHPriceFetcher();
    const oneUnitBigNum = BigNumber.from((10n ** 18n).toString());
    const wstEthToStEthBigNum = await wstETHContract.getStETHByWstETH(oneUnitBigNum);
    const wstEthToStEth = wstEthToStEthBigNum.toBigInt();
    // 1 stETH = stETHPrice USD
    // 1 wstETH = wstEthToStEth stETH
    // 1 wstETH = stETHPrice * wstEthToStEth
    const price = (BigInt(stEthPrice) * wstEthToStEth) / 10n ** 18n;
    return price;
  };
}

export function createAssetPriceFetcher(address: EthAddress, provider: Provider) {
  const addressStr = address.toString();
  switch (addressStr) {
    case S.wstETH:
      return createWstEthPriceFetcher(provider);
    default:
      const priceFeedContractAddressStr = getAssetPriceFeedAddressStr(address);
      if (!priceFeedContractAddressStr) return;
      return createDefaultPriceFetcher(priceFeedContractAddressStr, provider);
  }
}
