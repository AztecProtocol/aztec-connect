import { useAssetUnitPrice } from '../price_hooks.js';
import { useGasUnitPrice } from '../top_level_context/index.js';
import { convertToBulkPrice } from '../../app/index.js';

const ETH_ASSET_ID = 0;
const ETH_DECIMALS = 18;

export function useGasBulkPrice(gas?: bigint) {
  const ethUnitPrice = useAssetUnitPrice(ETH_ASSET_ID);
  const gasUnitPrice = useGasUnitPrice();
  if (gas === undefined || ethUnitPrice === undefined || gasUnitPrice === undefined) return;
  return convertToBulkPrice(gas * gasUnitPrice, ETH_DECIMALS, ethUnitPrice);
}
