import type { DefiPosition } from 'alt-model/defi/open_position_hooks';
import { useDefaultExpectedAssetYield, useCurrentAssetYield } from 'alt-model/defi/defi_info_hooks';
import { DefiInvestmentType, DefiRecipe } from 'alt-model/defi/types';

const percentageFormatter = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 1 });

function Apy({
  expectedYield,
  investmentType,
  roiType,
}: {
  expectedYield?: number;
  investmentType: DefiInvestmentType;
  roiType: string;
}) {
  if (expectedYield === undefined) return <></>;
  const yieldStr = percentageFormatter.format(expectedYield / 100);
  const typeStr = investmentType === DefiInvestmentType.FIXED_YIELD ? 'Fixed' : 'Variable';

  return (
    <>
      {typeStr}: {yieldStr} {roiType}
    </>
  );
}

function ApyFromInteractionNonce({
  recipe,
  interactionNonce,
  position,
}: {
  recipe: DefiRecipe;
  interactionNonce: number;
  position: DefiPosition;
}) {
  const expectedYield = useCurrentAssetYield(recipe, interactionNonce);
  return <Apy expectedYield={expectedYield} investmentType={recipe.investmentType} roiType={position.recipe.roiType} />;
}

function ApyFromDefaultAux({ recipe, position }: { recipe: DefiRecipe; position: DefiPosition }) {
  const expectedYield = useDefaultExpectedAssetYield(recipe);
  return <Apy expectedYield={expectedYield} investmentType={recipe.investmentType} roiType={position.recipe.roiType} />;
}

export function renderApyField(position: DefiPosition) {
  switch (position.type) {
    case 'async': {
      const { interactionNonce } = position.tx.interactionResult;
      if (interactionNonce !== undefined) {
        return (
          <ApyFromInteractionNonce recipe={position.recipe} interactionNonce={interactionNonce} position={position} />
        );
      } else {
        return <ApyFromDefaultAux recipe={position.recipe} position={position} />;
      }
    }
    case 'sync-entering':
    case 'sync-exiting':
    case 'sync-open':
      return <ApyFromDefaultAux recipe={position.recipe} position={position} />;
  }
}
