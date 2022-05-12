import type { DefiRecipe } from 'alt-model/defi/types';
import { formatBulkPrice } from 'app';
import { useExpectedOutput } from 'alt-model/defi/defi_info_hooks';
import { useAmount } from 'alt-model/asset_hooks';
import { useAmountBulkPrice } from 'alt-model/price_hooks';
import { DefiFormValidationResult } from 'alt-model/defi/defi_form';
import style from './expected_exit_output_section.module.css';
import { ExitExchangeRateInfo } from './exit_exchange_rate_info';

interface ExpectedExitOutputSectionProps {
  recipe: DefiRecipe;
  validationResult: DefiFormValidationResult;
}

export function ExpectedExitOutputSection(props: ExpectedExitOutputSectionProps) {
  const auxData = props.validationResult.input.bridgeId?.auxData;
  const inputValue = props.validationResult.targetDepositAmount?.baseUnits;
  const maybeAuxData = auxData !== undefined ? BigInt(auxData) : undefined;
  const maybeInputValue = (inputValue ?? 0n) > 0n ? inputValue : undefined;
  const expectedOutput = useExpectedOutput(props.recipe.id, maybeAuxData, maybeInputValue);
  const amount = useAmount(expectedOutput);
  const amountStr = amount ? `~${amount?.format({ uniform: true })}` : undefined;
  const bulkPrice = useAmountBulkPrice(amount);
  const bulkPriceStr = bulkPrice !== undefined ? `$${formatBulkPrice(bulkPrice)}` : undefined;

  const inputRequired = inputValue === 0n;
  return (
    <div className={style.root}>
      <div className={style.heading}>You will receive approximately:</div>
      <div className={style.result}>
        {inputRequired && <div className={style.prompt}>Please enter a non-zero amount</div>}
        <div className={style.amount}>{amountStr}</div>
        <div className={style.price}>{bulkPriceStr}</div>
      </div>
      <div className={style.exchangeWrapper}>
        <ExitExchangeRateInfo recipe={props.recipe} auxData={maybeAuxData} />
      </div>
    </div>
  );
}
