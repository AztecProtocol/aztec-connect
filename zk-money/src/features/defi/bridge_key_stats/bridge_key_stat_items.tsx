import { useExpectedYield, useLiquidity } from 'alt-model/defi/defi_info_hooks';
import { DefiRecipe, KeyBridgeStat } from 'alt-model/defi/types';
import { baseUnitsToFloat, PRICE_DECIMALS } from 'app';

const formatter = new Intl.NumberFormat('en-GB', { notation: 'compact' });

function formatPriceShort(value: bigint) {
  return formatter.format(baseUnitsToFloat(value, PRICE_DECIMALS));
}

function LiquidityValue(props: { recipe: DefiRecipe }) {
  const liquidity = useLiquidity(props.recipe.id);
  const valueStr = liquidity !== undefined ? `$${formatPriceShort(liquidity)}` : '??';
  return <>{valueStr}</>;
}

const percentageFormatter = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 1 });

function YieldValue(props: { recipe: DefiRecipe }) {
  const expectedYield = useExpectedYield(props.recipe);
  const yieldStr = expectedYield !== undefined ? percentageFormatter.format(expectedYield) : '??';
  return <>{yieldStr}</>;
}

const dateFormatter = new Intl.DateTimeFormat('default', { day: 'numeric', month: 'short', year: '2-digit' });

function MaturityValue(props: { recipe: DefiRecipe }) {
  // Assume aux data is unix datetime for now
  const ms = props.recipe.bridgeFlow.enter.auxData * 1000;
  const dateStr = dateFormatter.format(ms);
  return <>{dateStr}</>;
}

export function getKeyStatItemProps(stat: KeyBridgeStat, recipe: DefiRecipe) {
  switch (stat) {
    case KeyBridgeStat.LIQUIDITY:
      return { label: 'L1 Liquidity', value: <LiquidityValue recipe={recipe} /> };
    case KeyBridgeStat.BATCH_SIZE:
      return { label: 'Batch Size', value: 'TBC' };
    case KeyBridgeStat.YIELD:
      return { label: 'Current Yield (APY)', value: <YieldValue recipe={recipe} /> };
    case KeyBridgeStat.FIXED_YIELD:
      return { label: 'Fixed Yield (APY)', value: <YieldValue recipe={recipe} /> };
    case KeyBridgeStat.MATURITY:
      return { label: 'Maturity', value: <MaturityValue recipe={recipe} /> };
  }
}
