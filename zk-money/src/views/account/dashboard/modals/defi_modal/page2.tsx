import { useState } from 'react';
import styled from 'styled-components/macro';
import { DefiComposerPhase, DefiComposerState, DefiFormValidationResult } from 'alt-model/defi/defi_form';
import { Theme, themeColours } from 'styles';
import { BorderBox, Button, Text } from 'components';
import { DefiSubmissionSteps } from './defi_submission_steps';
import { Disclaimer } from '../modal_molecules/disclaimer';
import { TransactionComplete } from '../modal_molecules/transaction_complete';
import { DefiRecipe } from 'alt-model/defi/types';
import { BridgeCountDown } from 'features/defi/bridge_count_down';
import { BridgeKeyStats } from 'features/defi/bridge_key_stats';
import { CostBreakdown } from '../modal_molecules/cost_breakdown';

const S = {
  Root: styled.div`
    display: grid;
    gap: 10px;
  `,

  TopStats: styled.div`
    display: grid;
    grid-template-columns: 3fr 2fr 5fr;
    gap: 10%;
    padding: 20px 25px;
  `,

  Separator: styled.div`
    width: 100%;
    height: 1px;
    background-color: ${themeColours[Theme.WHITE].border};
  `,

  Footer: styled.div`
    display: flex;
    justify-content: space-between;
    /* align-items: center; */
    justify-self: self-end;
    align-self: end;
  `,

  BorderBox: styled(BorderBox)`
    padding: 20px;
  `,
};

interface Page2Props {
  recipe: DefiRecipe;
  composerState: DefiComposerState;
  validationResult: DefiFormValidationResult;
  onSubmit: () => void;
  onClose: () => void;
}

export function Page2({ recipe, composerState, validationResult, onSubmit, onClose }: Page2Props) {
  const asset = recipe.inputAssetA;
  const [riskChecked, setRiskChecked] = useState(false);
  const hasError = !!composerState?.error;
  const isIdle = composerState?.phase === DefiComposerPhase.IDLE;
  const showingDeclaration = isIdle && !hasError;
  const showingComplete = composerState?.phase === DefiComposerPhase.DONE;
  const canSubmit = riskChecked && isIdle;
  return (
    <S.Root>
      <BorderBox>
        <S.TopStats>
          <Text size="xxs" italic text={recipe.shortDesc} />
          <BridgeCountDown recipe={recipe} compact />
          <BridgeKeyStats recipe={recipe} compact />
        </S.TopStats>
        <S.Separator />
        <CostBreakdown amount={validationResult.input.targetOutputAmount} fee={validationResult.input.feeAmount} />
      </BorderBox>
      <S.BorderBox>
        {showingDeclaration ? (
          <Disclaimer
            accepted={riskChecked}
            onChangeAccepted={setRiskChecked}
            asset={asset}
            transactionLimit={validationResult.input.transactionLimit ?? 0n}
          />
        ) : showingComplete ? (
          <TransactionComplete onClose={onClose} />
        ) : (
          <DefiSubmissionSteps composerState={composerState} />
        )}
      </S.BorderBox>
      <S.Footer>
        <Button
          text={hasError ? 'Retry' : 'Confirm Submit'}
          onClick={riskChecked ? onSubmit : undefined}
          disabled={!canSubmit}
        />
      </S.Footer>
    </S.Root>
  );
}
