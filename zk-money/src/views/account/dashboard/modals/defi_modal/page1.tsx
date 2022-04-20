import type { StrOrMax } from 'alt-model/forms/constants';
import styled from 'styled-components/macro';
import { Button } from 'components';
import { DefiFormFeedback, DefiFormFields, DefiFormValidationResult } from 'alt-model/defi/defi_form';
import { AmountSection, DescriptionSection, StatsSection } from 'views/account/dashboard/modals/sections';
import { DefiRecipe } from 'alt-model/defi/types';
import { DefiSettlementTime } from '@aztec/sdk';
import { FaqHint, Hyperlink, HyperlinkIcon } from 'ui-components';
import { SplitSection } from '../sections/split_section';
import { RecipeSettlementTimeInformationSection } from '../sections/settlement_time_information_section';
import { PrivacyInformationSection } from '../sections/privacy_information_section';
import defiBridgeImage from 'images/defi_bridge.svg';
import style from './page1.module.scss';
import { DefiGasSection } from './defi_gas_section';

const Root = styled.div`
  display: flex;
  flex-direction: column;
  grid-gap: 30px;
  gap: 30px;
  grid-template-columns: 1fr 1fr;
  max-height: calc(100vh - 100px);
  padding: 30px 30px;
  overflow: auto;
`;

interface Page1Props {
  recipe: DefiRecipe;
  fields: DefiFormFields;
  validationResult: DefiFormValidationResult;
  feedback: DefiFormFeedback;
  onChangeAmountStrOrMax: (value: StrOrMax) => void;
  onChangeSpeed: (value: DefiSettlementTime) => void;
  onNext: () => void;
}

export function Page1({
  recipe,
  fields,
  validationResult,
  feedback,
  onChangeAmountStrOrMax,
  onChangeSpeed,
  onNext,
}: Page1Props) {
  return (
    <Root>
      <div className={style.descriptionWrapper}>
        <DescriptionSection text={recipe.longDescription} />
        <img src={defiBridgeImage} />
      </div>
      <div className={style.statsWrapper}>
        <StatsSection recipe={recipe} />
        <div className={style.links}>
          <Hyperlink label={'View Contract'} icon={HyperlinkIcon.Open} />
          <Hyperlink label={'View Website'} icon={HyperlinkIcon.Open} />
        </div>
      </div>
      <SplitSection
        leftPanel={
          <>
            <AmountSection
              maxAmount={validationResult.maxOutput ?? 0n}
              asset={validationResult.input.depositAsset}
              amountStrOrMax={fields.amountStrOrMax}
              onChangeAmountStrOrMax={onChangeAmountStrOrMax}
              message={feedback.amount}
              balanceType="L2"
            />
          </>
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
            speed={fields.speed as DefiSettlementTime}
            onChangeSpeed={onChangeSpeed}
            recipe={recipe}
            feeAmounts={validationResult?.feeAmounts}
          />
        }
        rightPanel={<RecipeSettlementTimeInformationSection recipe={recipe} />}
      />
      <div className={style.footer}>
        <FaqHint className={style.faqHint} />
        <Button text="Next" onClick={onNext} disabled={!validationResult.isValid} />
      </div>
    </Root>
  );
}
