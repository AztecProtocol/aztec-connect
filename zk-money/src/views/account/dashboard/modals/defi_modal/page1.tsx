import styled from 'styled-components/macro';
import { Button } from 'components';
import { DefiFormFeedback, DefiFormFields, DefiFormValidationResult } from 'alt-model/defi/defi_form';
import {
  AmountSection,
  DescriptionSection,
  GasSection,
  GasSectionType,
  ProgressSection,
  StatsSection,
} from 'views/account/dashboard/modals/sections';
import { DefiRecipe } from 'alt-model/defi/types';

import { DefiSettlementTime } from '@aztec/sdk';
import { FaqHint } from 'ui-components';
import style from './page1.module.scss';

const Root = styled.div`
  display: grid;
  gap: 30px;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    'img progress'
    'desc desc'
    'amount stats'
    'amount fee';
`;

const NextWrapper = styled.div`
  justify-self: end;
  align-self: end;
`;

interface Page1Props {
  recipe: DefiRecipe;
  fields: DefiFormFields;
  validationResult: DefiFormValidationResult;
  feedback: DefiFormFeedback;
  onChangeAmountStr: (value: string) => void;
  onChangeSpeed: (value: DefiSettlementTime) => void;
  onNext: () => void;
}

export function Page1({
  recipe,
  fields,
  validationResult,
  feedback,
  onChangeAmountStr,
  onChangeSpeed,
  onNext,
}: // amount
Page1Props) {
  return (
    <Root>
      <div />
      <ProgressSection recipe={recipe} />
      <DescriptionSection text={recipe.longDescription} />
      <AmountSection
        maxAmount={validationResult.maxOutput ?? 0n}
        asset={recipe.inputAssetA}
        amountStr={fields.amountStr}
        onChangeAmountStr={onChangeAmountStr}
        message={feedback.amount}
        balanceType="L2"
      />
      <StatsSection recipe={recipe} />
      <GasSection
        type={GasSectionType.DEFI}
        speed={fields.speed as DefiSettlementTime}
        onChangeSpeed={speed => onChangeSpeed(speed as DefiSettlementTime)}
        feeAmount={validationResult.input.feeAmount}
        recipe={recipe}
      />
      <FaqHint className={style.faqHint} />
      <NextWrapper>
        <Button text="Next" onClick={onNext} disabled={!validationResult.isValid} />
      </NextWrapper>
    </Root>
  );
}
