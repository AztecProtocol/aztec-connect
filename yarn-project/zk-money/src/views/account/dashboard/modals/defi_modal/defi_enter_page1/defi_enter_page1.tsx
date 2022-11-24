import { DefiSettlementTime } from '@aztec/sdk';
import type { StrOrMax } from '../../../../../../alt-model/forms/constants.js';
import {
  DefiFormFeedback,
  DefiFormFields,
  DefiFormValidationResult,
} from '../../../../../../alt-model/defi/defi_form/index.js';
import { DescriptionSection, StatsSection } from '../../../../../../views/account/dashboard/modals/sections/index.js';
import { DefiRecipe, FlowDirection } from '../../../../../../alt-model/defi/types.js';
import { SplitSection } from '../../sections/split_section/index.js';
import { RecipeSettlementTimeInformationSection } from '../../sections/settlement_time_information_section/index.js';
import { PrivacyInformationSection } from '../../sections/privacy_information_section/index.js';
import { DefiGasSection } from './../defi_gas_section.js';
import { DefiWebLinks } from './../defi_web_links/index.js';
import { FooterSection } from '../../sections/footer_section/index.js';
import { AmountSelection } from '../../../../../../components/index.js';
import style from './defi_enter_page1.module.scss';

interface DefiEnterPage1Props {
  flowDirection: FlowDirection;
  recipe: DefiRecipe;
  fields: DefiFormFields;
  validationResult: DefiFormValidationResult;
  feedback: DefiFormFeedback;
  onChangeAmountStrOrMax: (value: StrOrMax) => void;
  onChangeSpeed: (value: DefiSettlementTime) => void;
  onNext: () => void;
}

export function DefiEnterPage1({
  flowDirection,
  recipe,
  fields,
  validationResult,
  feedback,
  onChangeAmountStrOrMax,
  onChangeSpeed,
  onNext,
}: DefiEnterPage1Props) {
  const displayedInputAsset =
    flowDirection === 'exit' && recipe.flow.type === 'closable'
      ? recipe.flow.exit.inDisplayed
      : recipe.flow.enter.inDisplayed;
  return (
    <div className={style.root}>
      <DescriptionSection text={recipe.longDescription} />
      <div className={style.statsWrapper}>
        <StatsSection recipe={recipe} />
        <DefiWebLinks recipe={recipe} />
      </div>
      <SplitSection
        leftPanel={
          <AmountSelection
            maxAmount={validationResult.maxOutput ?? 0n}
            asset={displayedInputAsset}
            amountStringOrMax={fields.amountStrOrMax}
            onChangeAmountStringOrMax={onChangeAmountStrOrMax}
            message={feedback.amount}
            balanceType="L2"
          />
        }
        rightPanel={
          <PrivacyInformationSection
            amount={validationResult.validPayload?.targetDepositAmount?.baseUnits || 0n}
            asset={validationResult.input.displayedInputAsset}
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
            feeAmounts={validationResult?.feeAmounts}
            selectedSpeed={fields.speed}
          />
        }
      />
      <FooterSection onNext={onNext} nextDisabled={!validationResult.isValid} feedback={feedback.footer} />
    </div>
  );
}
