import { useRollupProviderStatus } from 'alt-model';
import {
  useDefaultAuxDataOption,
  useDefaultBridgeId,
  useDefaultExpectedAssetYield,
  useDefaultLiquidity,
} from 'alt-model/defi/defi_info_hooks';
import { DefiRecipe, KeyBridgeStat } from 'alt-model/defi/types';
import { baseUnitsToFloat, PRICE_DECIMALS } from 'app';
import { SkeletonRect } from './skeleton_rect';

const formatter = new Intl.NumberFormat('en-GB', { notation: 'compact' });

function formatPriceShort(value: bigint) {
  return formatter.format(baseUnitsToFloat(value, PRICE_DECIMALS));
}

function LiquidityValue(props: { recipe: DefiRecipe }) {
  const liquidity = useDefaultLiquidity(props.recipe.id);
  if (liquidity === undefined) return <SkeletonRect sizingContent="$11B" />;
  return <>${formatPriceShort(liquidity)}</>;
}

function BatchSizeValue(props: { recipe: DefiRecipe }) {
  const bridgeId = useDefaultBridgeId(props.recipe)?.toBigInt();
  const rpStatus = useRollupProviderStatus();
  if (!rpStatus?.bridgeStatus || !bridgeId) return <SkeletonRect sizingContent="25" />;
  const bridgeStatus = rpStatus.bridgeStatus.find(x => x.bridgeId === bridgeId);
  return <>{bridgeStatus?.numTxs ?? rpStatus.runtimeConfig.defaultDeFiBatchSize}</>;
}

const percentageFormatter = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 2 });

function YieldValue(props: { recipe: DefiRecipe }) {
  const expectedYield = useDefaultExpectedAssetYield(props.recipe);
  if (expectedYield === undefined) return <SkeletonRect sizingContent="2.34%" />;
  return <>{percentageFormatter.format(expectedYield / 100)}</>;
}

const dateFormatter = new Intl.DateTimeFormat('default', { day: 'numeric', month: 'short', year: '2-digit' });

function MaturityValue(props: { recipe: DefiRecipe }) {
  // Assume aux data is unix datetime for now
  const auxData = useDefaultAuxDataOption(props.recipe.id);
  if (auxData === undefined) return <SkeletonRect sizingContent="16 Sept 2022" />;
  const ms = Number(auxData) * 1000;
  return <>{dateFormatter.format(ms)}</>;
}

export function getKeyStatItemProps(stat: KeyBridgeStat, recipe: DefiRecipe) {
  switch (stat) {
    case KeyBridgeStat.LIQUIDITY:
      return { label: 'L1 Liquidity', value: <LiquidityValue recipe={recipe} /> };
    case KeyBridgeStat.BATCH_SIZE:
      return { label: 'Batch Size', value: <BatchSizeValue recipe={recipe} /> };
    case KeyBridgeStat.YIELD:
    case KeyBridgeStat.FIXED_YIELD:
      return { label: recipe.roiType, value: <YieldValue recipe={recipe} /> };
    case KeyBridgeStat.MATURITY:
      return { label: 'Maturity', value: <MaturityValue recipe={recipe} /> };
  }
}
