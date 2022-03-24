import { useRollupProviderStatus } from 'alt-model';
import {
  useDefaultAuxDataOption,
  useDefaultBridgeId,
  useDefaultExpectedYield,
  useDefaultLiquidity,
} from 'alt-model/defi/defi_info_hooks';
import { DefiRecipe, KeyBridgeStat } from 'alt-model/defi/types';
import { baseUnitsToFloat, PRICE_DECIMALS } from 'app';

const formatter = new Intl.NumberFormat('en-GB', { notation: 'compact' });

function formatPriceShort(value: bigint) {
  return formatter.format(baseUnitsToFloat(value, PRICE_DECIMALS));
}

function LiquidityValue(props: { recipe: DefiRecipe }) {
  const liquidity = useDefaultLiquidity(props.recipe.id);
  const valueStr = liquidity !== undefined ? `$${formatPriceShort(liquidity)}` : '??';
  return <>{valueStr}</>;
}

function BatchSizeValue(props: { recipe: DefiRecipe }) {
  const bridgeId = useDefaultBridgeId(props.recipe)?.toBigInt();
  const rpStatus = useRollupProviderStatus();
  const bridgeStatus = rpStatus?.bridgeStatus.find(x => x.bridgeId === bridgeId);
  return <>{bridgeStatus?.numTxs ?? rpStatus?.runtimeConfig.defaultDeFiBatchSize}</>;
}

const percentageFormatter = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 1 });

function YieldValue(props: { recipe: DefiRecipe }) {
  const expectedYield = useDefaultExpectedYield(props.recipe);
  const yieldStr = expectedYield !== undefined ? percentageFormatter.format(expectedYield) : '??';
  return <>{yieldStr}</>;
}

const dateFormatter = new Intl.DateTimeFormat('default', { day: 'numeric', month: 'short', year: '2-digit' });

function MaturityValue(props: { recipe: DefiRecipe }) {
  // Assume aux data is unix datetime for now
  const auxData = useDefaultAuxDataOption(props.recipe.id);
  if (auxData === undefined) return <>??</>;
  const ms = Number(auxData) * 1000;
  const dateStr = dateFormatter.format(ms);
  return <>{dateStr}</>;
}

export function getKeyStatItemProps(stat: KeyBridgeStat, recipe: DefiRecipe) {
  switch (stat) {
    case KeyBridgeStat.LIQUIDITY:
      return { label: 'L1 Liquidity', value: <LiquidityValue recipe={recipe} /> };
    case KeyBridgeStat.BATCH_SIZE:
      return { label: 'Batch Size', value: <BatchSizeValue recipe={recipe} /> };
    case KeyBridgeStat.YIELD:
      return { label: 'Current Yield (APY)', value: <YieldValue recipe={recipe} /> };
    case KeyBridgeStat.FIXED_YIELD:
      return { label: 'Fixed Yield (APY)', value: <YieldValue recipe={recipe} /> };
    case KeyBridgeStat.MATURITY:
      return { label: 'Maturity', value: <MaturityValue recipe={recipe} /> };
  }
}
