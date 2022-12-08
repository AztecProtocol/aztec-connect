import type { DefiRecipe } from '../../../../../../../alt-model/defi/types.js';
import { formatBulkPrice } from '../../../../../../../app/index.js';
import { useExpectedOutput } from '../../../../../../../alt-model/defi/defi_info_hooks.js';
import { useAmount } from '../../../../../../../alt-model/asset_hooks.js';
import { useAmountBulkPrice } from '../../../../../../../alt-model/price_hooks.js';
import { DefiFormValidationResult } from '../../../../../../../alt-model/defi/defi_form/index.js';
import style from './expected_exit_output_section.module.css';
import { ExitExchangeRateInfo } from './exit_exchange_rate_info.js';
import { AssetValue } from '@aztec/sdk';

interface ExpectedExitOutputSectionProps {
  recipe: DefiRecipe;
  validationResult: DefiFormValidationResult;
}

export function ExpectedExitOutputSection(props: ExpectedExitOutputSectionProps) {
  const auxData = props.validationResult.input.bridgeCallData?.auxData;
  const inputValue = props.validationResult.targetDepositAmount?.baseUnits;
  const maybeInputValue = (inputValue ?? 0n) > 0n ? inputValue : undefined;
  const expectedOutput = useExpectedOutput(props.recipe.id, 'exit', auxData, maybeInputValue);
  if (props.recipe.flow.type !== 'closable') {
    throw new Error('Cannot display exit output for non-closable recipe');
  }
  let displayedOutputValue: AssetValue | undefined;
  const displayedAssetId = props.recipe.flow.exit.outDisplayed.id;
  if (displayedAssetId === expectedOutput?.outputValueA.assetId) {
    displayedOutputValue = expectedOutput?.outputValueA;
  } else if (displayedAssetId === expectedOutput?.outputValueB?.assetId) {
    displayedOutputValue = expectedOutput?.outputValueB;
  }
  const amount = useAmount(displayedOutputValue);
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
        {props.recipe.showExchangeRate && <ExitExchangeRateInfo recipe={props.recipe} auxData={auxData} />}
      </div>
    </div>
  );
}
