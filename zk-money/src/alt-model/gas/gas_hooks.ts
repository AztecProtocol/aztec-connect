import { useAssetUnitPrice } from 'alt-model/price_hooks';
import { useGasUnitPrice } from 'alt-model/top_level_context';
import { convertToBulkPrice } from 'app';

const ETH_ASSET_ID = 0;
const ETH_DECIMALS = 18;

export function useGasBulkPrice(gas?: bigint) {
  const ethUnitPrice = useAssetUnitPrice(ETH_ASSET_ID);
  const gasUnitPrice = useGasUnitPrice();
  if (gas === undefined || ethUnitPrice === undefined || gasUnitPrice === undefined) return;
  return convertToBulkPrice(gas * gasUnitPrice, ETH_DECIMALS, ethUnitPrice);
}
