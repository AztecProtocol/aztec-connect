import styled from 'styled-components/macro';
import { Asset } from '../../../../app';
import { Text, BorderBox, Link, Button } from '../../../../components';
import { RecipeStats } from './recipe_stats';
import faqIcon from '../../../../images/faq_icon_gradient.svg';
import { DefiFormFieldAnnotations, DefiFormFields } from './types';
import { GasSection } from './gas_section';
import { AmountSection } from './amount_section';

const Root = styled.div`
  display: grid;
  gap: 50px;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    'amount stats'
    'amount gas';
`;

const FaqLink = styled.div`
  justify-self: start;
`;

const FaqIcon = styled.div`
  display: inline-block;
  width: 30px;
  height: 24px;
  margin-left: 4px;
  transform: translateY(9px);
  background: url(${faqIcon});
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
`;

const NextWrapper = styled.div`
  justify-self: end;
`;

interface Page1Props {
  fields: DefiFormFields;
  onChangeFields: (fields: DefiFormFields) => void;
  inputAsset: Asset;
  fieldAnnotations: DefiFormFieldAnnotations;
  onNext: () => void;
  nextDisabled: boolean;
  fee: bigint | undefined;
}

export function Page1({ fields, onChangeFields, fieldAnnotations, inputAsset, onNext, nextDisabled, fee }: Page1Props) {
  return (
    <Root>
      <BorderBox area="amount">
        <AmountSection
          asset={inputAsset}
          amountStr={fields.amountStr}
          onChangeAmountStr={amountStr => onChangeFields({ ...fields, amountStr })}
          amountStrAnnotation={fieldAnnotations.amountStr}
        />
      </BorderBox>
      <BorderBox area="stats">
        <RecipeStats />
      </BorderBox>
      <BorderBox area="gas">
        <GasSection
          speed={fields.speed}
          onChangeSpeed={speed => onChangeFields({ ...fields, speed })}
          asset={inputAsset}
          fee={fee}
        />
      </BorderBox>
      <FaqLink>
        <Text size="xxs">
          Need help? Check out the
          <Link href="https://aztec-protocol.gitbook.io/zk-money/faq" target="_blank">
            <FaqIcon />
          </Link>
        </Text>
      </FaqLink>
      <NextWrapper>
        <Button text="Next" onClick={nextDisabled ? undefined : onNext} disabled={nextDisabled} />
      </NextWrapper>
    </Root>
  );
}
