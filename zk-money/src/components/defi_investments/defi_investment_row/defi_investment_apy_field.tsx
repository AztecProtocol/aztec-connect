import type {
  DefiPosition,
  DefiPosition_Async,
  DefiPosition_Closable,
  DefiPosition_Pending,
} from 'alt-model/defi/open_position_hooks';
import { useDefaultExpectedAssetYield, useCurrentAssetYield } from 'alt-model/defi/defi_info_hooks';
import { DefiInvestmentType } from 'alt-model/defi/types';

const percentageFormatter = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 1 });

function Apy({ expectedYield, investmentType }: { expectedYield?: number; investmentType: DefiInvestmentType }) {
  if (expectedYield === undefined) return <></>;
  const yieldStr = percentageFormatter.format(expectedYield / 100);
  const typeStr = investmentType === DefiInvestmentType.FIXED_YIELD ? 'Fixed' : 'Variable';
  return (
    <>
      {typeStr}: {yieldStr} APY
    </>
  );
}

function ApyFromTxAux({ position }: { position: DefiPosition_Pending | DefiPosition_Async }) {
  const { interactionNonce = 0 } = position.tx.interactionResult;

  const expectedYield = useCurrentAssetYield(position.recipe, interactionNonce);

  return <Apy expectedYield={expectedYield} investmentType={position.recipe.investmentType} />;
}

function ApyFromDefaultAux({ position }: { position: DefiPosition_Closable | DefiPosition_Pending }) {
  const expectedYield = useDefaultExpectedAssetYield(position.recipe);
  return <Apy expectedYield={expectedYield} investmentType={position.recipe.investmentType} />;
}

export function renderApyField(position: DefiPosition) {
  switch (position.type) {
    case 'pending':
      return <ApyFromDefaultAux position={position} />;
    case 'async':
      return <ApyFromTxAux position={position} />;
    case 'closable':
      return <ApyFromDefaultAux position={position} />;
    case 'pending-exit':
      return <>Exiting...</>;
  }
}
