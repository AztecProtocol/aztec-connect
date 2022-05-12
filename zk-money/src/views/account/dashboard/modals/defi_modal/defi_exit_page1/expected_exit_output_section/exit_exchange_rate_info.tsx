import type { DefiRecipe } from 'alt-model/defi/types';
import { useExpectedOutput } from 'alt-model/defi/defi_info_hooks';
import { useAmount } from 'alt-model/asset_hooks';
import { InfoTooltip } from 'ui-components';
import { Amount } from 'alt-model/assets';
import { useAmountBulkPrice } from 'alt-model';
import { formatBulkPrice } from 'app';
import style from './exit_exchange_rate_info.module.css';

interface ExitExchangeRateInfoProps {
  recipe: DefiRecipe;
  auxData?: bigint;
}

export function ExitExchangeRateInfo(props: ExitExchangeRateInfoProps) {
  const { flow } = props.recipe;
  if (flow.type !== 'closable') {
    throw new Error("Can't calculate exit exchange rate for non-closable recipe.");
  }
  const unitOfInput = Amount.from('1', flow.exit.inA);
  const expectedOutput = useExpectedOutput(props.recipe.id, props.auxData, unitOfInput.baseUnits);
  const expectedOutputAmount = useAmount(expectedOutput);
  const expectedOutputBulkPrice = useAmountBulkPrice(expectedOutputAmount);

  if (expectedOutputAmount === undefined || expectedOutputBulkPrice === undefined) return <></>;
  const exchangeStr = `${unitOfInput.format({ layer: 'L1' })} = ${expectedOutputAmount.format({
    layer: 'L1',
    uniform: true,
  })} `;
  return (
    <div className={style.root}>
      {exchangeStr}
      <span className={style.price}> (${formatBulkPrice(expectedOutputBulkPrice)})</span>
      <InfoTooltip text="Prices are fetched live. Final settlement price may differ based on rollup latency." />
    </div>
  );
}
