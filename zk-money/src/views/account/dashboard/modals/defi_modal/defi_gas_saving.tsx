import type { Amount } from 'alt-model/assets';
import { useAmountBulkPrice, useRollupProviderStatus } from 'alt-model';
import { useGasBulkPrice } from 'alt-model/gas/gas_hooks';
import { formatBulkPrice } from 'app';

export function DefiGasSaving(props: { feeAmount?: Amount; bridgeAddressId: number }) {
  const feeBulkPrice = useAmountBulkPrice(props.feeAmount);
  const rpStatus = useRollupProviderStatus();
  const bridgeStatus = rpStatus?.blockchainStatus.bridges.find(x => x.id === props.bridgeAddressId);
  const bridgeGas = bridgeStatus?.gasLimit !== undefined ? BigInt(bridgeStatus.gasLimit) : undefined;
  const l1GasBulkPrice = useGasBulkPrice(bridgeGas);
  if (l1GasBulkPrice === undefined || feeBulkPrice === undefined) return <></>;
  const saving = l1GasBulkPrice - feeBulkPrice;
  if (saving <= 0n) return <></>;
  return (
    <p>
      Your Saving <b>${formatBulkPrice(saving)}</b> compared to L1 🎉
    </p>
  );
}
