import type { Amount } from '../../../../../../alt-model/assets/index.js';
import { useAmountBulkPrice } from '../../../../../../alt-model/index.js';
import { useGasBulkPrice } from '../../../../../../alt-model/gas/gas_hooks.js';
import { formatBulkPrice } from '../../../../../../app/index.js';

const APPROX_L1_ETH_TRANSFER_GAS = 24000n;
const APPROX_L1_ERC20_TRANSFER_GAS = 60000n;

interface TxGasSavingProps {
  targetAssetIsErc20?: boolean;
  feeAmount?: Amount;
}

export function TxGasSaving({ targetAssetIsErc20, feeAmount }: TxGasSavingProps) {
  const feeBulkPrice = useAmountBulkPrice(feeAmount);
  const transferGas = targetAssetIsErc20 ? APPROX_L1_ERC20_TRANSFER_GAS : APPROX_L1_ETH_TRANSFER_GAS;
  const l1GasBulkPrice = useGasBulkPrice(transferGas);
  if (l1GasBulkPrice === undefined || feeBulkPrice === undefined) return <></>;
  const saving = l1GasBulkPrice - feeBulkPrice;
  if (saving <= 0n) return <></>;
  if (targetAssetIsErc20) {
    return <>You're saving ${formatBulkPrice(saving)} compared to an average token transfer 🎉</>;
  } else {
    return <>You're saving ${formatBulkPrice(saving)} compared to an L1 send 🎉</>;
  }
}
