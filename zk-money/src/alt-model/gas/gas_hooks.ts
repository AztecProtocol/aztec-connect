import { useAssetPrice } from 'alt-model/price_hooks';
import { useGasPrice } from 'alt-model/top_level_context';
import { convertToPrice } from 'app';

const ETH_ASSET_ID = 0;
const ETH_DECIMALS = 18;

export function useGasCost(gas?: bigint) {
  const ethPrice = useAssetPrice(ETH_ASSET_ID);
  const gasPrice = useGasPrice();
  if (gas === undefined || ethPrice === undefined || gasPrice === undefined) return;
  return convertToPrice(gas * gasPrice, ETH_DECIMALS, ethPrice);
}
