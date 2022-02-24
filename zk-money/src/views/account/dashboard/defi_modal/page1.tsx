import styled from 'styled-components/macro';
import { Asset } from '../../../../app';
import { Text, BorderBox, Link, Button } from '../../../../components';
import faqIcon from '../../../../images/faq_icon_gradient.svg';
import { DefiFormFieldAnnotations, DefiFormFields } from './types';
import { GasSection } from './gas_section';
import { AmountSection } from './amount_section';
import { DefiRecipe } from 'alt-model/defi/types';
import { BridgeCountDown } from 'features/defi/bridge_count_down';
import { BridgeKeyStats } from 'features/defi/bridge_key_stats';

const Root = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    'img progress'
    'desc desc'
    'amount stats'
    'amount gas';
`;

const StatsBorderBox = styled(BorderBox)`
  padding: 0 25px;
  display: flex;
  align-items: center;
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
  recipe: DefiRecipe;
  fields: DefiFormFields;
  onChangeFields: (fields: DefiFormFields) => void;
  inputAsset: Asset;
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
  inputAsset,
  onNext,
  nextDisabled,
  fee,
  maxAmount,
}: Page1Props) {
  return (
    <Root>
      <img style={{ gridArea: 'img' }} src={recipe.bannerImg} alt="" />
      <div style={{ gridArea: 'progress', alignSelf: 'center' }}>
        <BridgeCountDown totalSlots={24} takenSlots={12} nextBatch={new Date(Date.now() + 1000 * 60 * 22)} />
      </div>
      <div style={{ gridArea: 'desc' }}>
        <Text italic size="xs" text={recipe.longDesc} />
      </div>
      <BorderBox area="amount">
        <AmountSection
          maxAmount={maxAmount}
          asset={inputAsset}
          allowAssetSelection={true}
          amountStr={fields.amountStr}
          onChangeAmountStr={amountStr => onChangeFields({ ...fields, amountStr })}
          amountStrAnnotation={fieldAnnotations.amountStr}
        />
      </BorderBox>
      <StatsBorderBox area="stats">
        <BridgeKeyStats recipe={recipe} compact />
      </StatsBorderBox>
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
