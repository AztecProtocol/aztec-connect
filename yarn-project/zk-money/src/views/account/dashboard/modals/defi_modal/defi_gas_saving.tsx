import type { Amount } from '../../../../../alt-model/assets/index.js';
import { useAmountBulkPrice, useRollupProviderStatus } from '../../../../../alt-model/index.js';
import { useGasBulkPrice } from '../../../../../alt-model/gas/gas_hooks.js';
import { formatBulkPrice } from '../../../../../app/index.js';
import style from './defi_gas_saving.module.scss';

export function DefiGasSaving(props: { feeAmount?: Amount; bridgeAddressId?: number }) {
  const feeBulkPrice = useAmountBulkPrice(props.feeAmount);
  const rpStatus = useRollupProviderStatus();
  const bridgeStatus = rpStatus?.blockchainStatus.bridges.find(x => x.id === props.bridgeAddressId);
  const bridgeGas = bridgeStatus?.gasLimit !== undefined ? BigInt(bridgeStatus.gasLimit) : undefined;
  const l1GasBulkPrice = useGasBulkPrice(bridgeGas);
  if (l1GasBulkPrice === undefined || feeBulkPrice === undefined) return <></>;
  const saving = l1GasBulkPrice - feeBulkPrice;
  if (saving <= 0n) return <></>;
  return (
    <div className={style.gasSaving}>
      You're saving <b>${formatBulkPrice(saving)}</b> compared to L1 🎉
    </div>
  );
}
