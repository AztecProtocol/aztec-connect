import styled from 'styled-components/macro';
import { Button } from 'components';
import { DefiFormFieldAnnotations, DefiFormFields } from './types';
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
  onChangeFields: (fields: DefiFormFields) => void;
  fieldAnnotations: DefiFormFieldAnnotations;
  onNext: () => void;
  nextDisabled: boolean;
  fee: bigint | undefined;
  maxAmount: bigint;
}

export function Page1({
  recipe,
  fields,
  onChangeFields,
  fieldAnnotations,
  onNext,
  nextDisabled,
  fee,
  maxAmount,
}: // amount
Page1Props) {
  return (
    <Root>
      <div />
      <ProgressSection />
      <DescriptionSection text={recipe.longDescription} />
      <AmountSection
        maxAmount={maxAmount}
        asset={recipe.inputAssetA}
        allowAssetSelection={true}
        amountStr={fields.amountStr}
        onChangeAmountStr={amountStr => onChangeFields({ ...fields, amountStr })}
        amountStrAnnotation={fieldAnnotations.amountStr}
        message={fieldAnnotations.amountStr?.text}
      />
      <StatsSection recipe={recipe} />
      <GasSection
        type={GasSectionType.DEFI}
        speed={fields.speed as DefiSettlementTime}
        onChangeSpeed={speed => onChangeFields({ ...fields, speed: speed as DefiSettlementTime })}
        asset={recipe.inputAssetA}
        fee={fee}
      />
      <FaqHint className={style.faqHint} />
      <NextWrapper>
        <Button text="Next" onClick={nextDisabled ? undefined : onNext} disabled={nextDisabled} />
      </NextWrapper>
    </Root>
  );
}
