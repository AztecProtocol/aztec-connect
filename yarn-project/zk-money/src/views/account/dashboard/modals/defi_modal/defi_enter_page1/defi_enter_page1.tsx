import type { StrOrMax } from '../../../../../../alt-model/forms/constants.js';
import {
  DefiFormFeedback,
  DefiFormFields,
  DefiFormValidationResult,
} from '../../../../../../alt-model/defi/defi_form/index.js';
import {
  AmountSection,
  DescriptionSection,
  StatsSection,
} from '../../../../../../views/account/dashboard/modals/sections/index.js';
import { DefiRecipe } from '../../../../../../alt-model/defi/types.js';
import { DefiSettlementTime } from '@aztec/sdk';
import { SplitSection } from '../../sections/split_section/index.js';
import { RecipeSettlementTimeInformationSection } from '../../sections/settlement_time_information_section/index.js';
import { PrivacyInformationSection } from '../../sections/privacy_information_section/index.js';
import style from './defi_enter_page1.module.scss';
import { DefiGasSection } from './../defi_gas_section.js';
import { DefiWebLinks } from './../defi_web_links/index.js';
import { FooterSection } from '../../sections/footer_section/index.js';

interface DefiEnterPage1Props {
  recipe: DefiRecipe;
  fields: DefiFormFields;
  validationResult: DefiFormValidationResult;
  feedback: DefiFormFeedback;
  onChangeAmountStrOrMax: (value: StrOrMax) => void;
  onChangeSpeed: (value: DefiSettlementTime) => void;
  onNext: () => void;
}

export function DefiEnterPage1({
  recipe,
  fields,
  validationResult,
  feedback,
  onChangeAmountStrOrMax,
  onChangeSpeed,
  onNext,
}: DefiEnterPage1Props) {
  return (
    <div className={style.root}>
      <DescriptionSection text={recipe.longDescription} />
      <div className={style.statsWrapper}>
        <StatsSection recipe={recipe} />
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
        rightPanel={
          <PrivacyInformationSection
            amount={validationResult.validPayload?.targetDepositAmount?.baseUnits || 0n}
            asset={validationResult.input.depositAsset}
          />
        }
      />
      <SplitSection
        leftPanel={
          <DefiGasSection
            speed={fields.speed}
            onChangeSpeed={onChangeSpeed}
            recipe={recipe}
            bridgeCallData={validationResult.input.bridgeCallData}
            feeAmounts={validationResult?.feeAmounts}
          />
        }
        rightPanel={
          <RecipeSettlementTimeInformationSection
            bridgeCallData={validationResult.input.bridgeCallData}
            selectedSpeed={fields.speed}
          />
        }
      />
      <FooterSection onNext={onNext} nextDisabled={!validationResult.isValid} feedback={feedback.footer} />
    </div>
  );
}
