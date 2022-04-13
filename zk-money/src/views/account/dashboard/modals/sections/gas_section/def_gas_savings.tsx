import type { Amount } from 'alt-model/assets';
import { useAmountBulkPrice, useRollupProviderStatus } from 'alt-model';
import { useGasBulkPrice } from 'alt-model/gas/gas_hooks';
import { formatBulkPrice } from 'app';

interface DefiGasSavingsProps {
  feeAmount?: Amount;
  bridgeAddressId: number;
}

export function DefiGasSavings({ feeAmount, bridgeAddressId }: DefiGasSavingsProps) {
  const feeBulkPrice = useAmountBulkPrice(feeAmount);
  const rpStatus = useRollupProviderStatus();
  const bridgeStatus = rpStatus?.blockchainStatus.bridges.find(x => x.id === bridgeAddressId);
  const bridgeGas = bridgeStatus?.gasLimit !== undefined ? BigInt(bridgeStatus.gasLimit) : undefined;
  const l1GasBulkPrice = useGasBulkPrice(bridgeGas);
  if (l1GasBulkPrice === undefined || feeBulkPrice === undefined) return <></>;
  const saving = l1GasBulkPrice - feeBulkPrice;
  if (saving <= 0n) return <></>;
  return <>You're saving {formatBulkPrice(saving)} compared to L1!</>;
}
