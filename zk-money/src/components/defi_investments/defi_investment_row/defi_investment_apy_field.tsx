import type {
  DefiPosition,
  DefiPosition_Async,
  DefiPosition_Closable,
  DefiPosition_Pending,
} from 'alt-model/defi/open_position_hooks';
import { useDefaultExpectedYield, useExpectedYield } from 'alt-model/defi/defi_info_hooks';
import { DefiInvestmentType } from 'alt-model/defi/types';

const percentageFormatter = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 2 });

function Apy({ expectedYield, investmentType }: { expectedYield?: number; investmentType: DefiInvestmentType }) {
  const yieldStr = expectedYield !== undefined ? percentageFormatter.format(expectedYield) : '??';
  const typeStr = investmentType === DefiInvestmentType.FIXED_YIELD ? 'Fixed' : 'Variable';
  return (
    <>
      {typeStr}: {yieldStr} APY
    </>
  );
}

function ApyFromTxAux({ position }: { position: DefiPosition_Pending | DefiPosition_Async }) {
  const expectedYield = useExpectedYield(position.recipe, BigInt(position.tx.bridgeId.auxData));
  return <Apy expectedYield={expectedYield} investmentType={position.recipe.investmentType} />;
}

function ApyFromDefaultAux({ position }: { position: DefiPosition_Closable }) {
  const expectedYield = useDefaultExpectedYield(position.recipe);
  return <Apy expectedYield={expectedYield} investmentType={position.recipe.investmentType} />;
}

export function renderApyField(position: DefiPosition) {
  switch (position.type) {
    case 'pending':
    case 'async':
      return <ApyFromTxAux position={position} />;
    case 'closable':
      return <ApyFromDefaultAux position={position} />;
  }
}
