import type { StrOrMax } from 'alt-model/forms/constants';
import { Button } from 'components';
import { DefiFormFeedback, DefiFormFields, DefiFormValidationResult } from 'alt-model/defi/defi_form';
import { AmountSection } from 'views/account/dashboard/modals/sections';
import { DefiRecipe } from 'alt-model/defi/types';
import { DefiSettlementTime } from '@aztec/sdk';
import { FaqHint } from 'ui-components';
import { SplitSection } from '../../sections/split_section';
import { RecipeSettlementTimeInformationSection } from '../../sections/settlement_time_information_section';
import style from './defi_exit_page1.module.css';
import { DefiGasSection } from './../defi_gas_section';
import { DefiWebLinks } from './../defi_web_links';
import { ExpectedExitOutputSection } from './expected_exit_output_section';

interface DefiExitPage1Props {
  recipe: DefiRecipe;
  fields: DefiFormFields;
  validationResult: DefiFormValidationResult;
  feedback: DefiFormFeedback;
  onChangeAmountStrOrMax: (value: StrOrMax) => void;
  onChangeSpeed: (value: DefiSettlementTime) => void;
  onNext: () => void;
}

export function DefiExitPage1({
  recipe,
  fields,
  validationResult,
  feedback,
  onChangeAmountStrOrMax,
  onChangeSpeed,
  onNext,
}: DefiExitPage1Props) {
  return (
    <div className={style.root}>
      <div className={style.top}>
        <div className={style.description}>{recipe.exitDesc}</div>
        <DefiWebLinks recipe={recipe} />
      </div>
      <SplitSection
        leftPanel={
          <AmountSection
            maxAmount={validationResult.maxOutput ?? 0n}
            asset={validationResult.input.depositAsset}
            amountStrOrMax={fields.amountStrOrMax}
            onChangeAmountStrOrMax={onChangeAmountStrOrMax}
            message={feedback.amount}
            balanceType="L2"
          />
        }
        rightPanel={<ExpectedExitOutputSection recipe={recipe} validationResult={validationResult} />}
      />
      <SplitSection
        leftPanel={
          <DefiGasSection
            speed={fields.speed}
            onChangeSpeed={onChangeSpeed}
            recipe={recipe}
            bridgeId={validationResult.input.bridgeId}
            feeAmounts={validationResult?.feeAmounts}
          />
        }
        rightPanel={<RecipeSettlementTimeInformationSection recipe={recipe} />}
      />
      <div className={style.footer}>
        <FaqHint className={style.faqHint} />
        <Button text="Next" onClick={onNext} disabled={!validationResult.isValid} />
      </div>
    </div>
  );
}
