import type { Amount } from 'alt-model/assets';
import { useAmountCost, useRollupProviderStatus } from 'alt-model';
import { useGasCost } from 'alt-model/gas/gas_hooks';
import { formatCost } from 'app';

interface DefiGasSavingsProps {
  feeAmount?: Amount;
  bridgeAddressId: number;
}

export function DefiGasSavings({ feeAmount, bridgeAddressId }: DefiGasSavingsProps) {
  const feeCost = useAmountCost(feeAmount);
  const rpStatus = useRollupProviderStatus();
  const bridgeStatus = rpStatus?.blockchainStatus.bridges.find(x => x.id === bridgeAddressId);
  const bridgeGas = bridgeStatus?.gasLimit !== undefined ? BigInt(bridgeStatus.gasLimit) : undefined;
  const l1GasCost = useGasCost(bridgeGas);
  if (l1GasCost === undefined || feeCost === undefined) return <></>;
  const saving = l1GasCost - feeCost;
  if (saving <= 0n) return <></>;
  return <>You're saving {formatCost(saving)} compared to L1!</>;
}
