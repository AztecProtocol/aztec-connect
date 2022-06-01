import { useState } from 'react';
import { BorderBox, Button } from 'components';
import { Disclaimer } from '../../modal_molecules/disclaimer';
import { TransactionComplete } from '../../modal_molecules/transaction_complete';
import { CostBreakdown } from '../../modal_molecules/cost_breakdown';
import {
  DefiComposerPhase,
  DefiComposerState,
  DefiFormValidationResult,
  DefiComposerPayload,
} from 'alt-model/defi/defi_form';
import { DefiInvestmentType, DefiRecipe, FlowDirection } from 'alt-model/defi/types';
import { DefiSubmissionSteps } from './defi_submission_steps';
import {
  useDefaultAuxDataOption,
  useDefaultExpectedAssetYield,
  useExpectedOutput,
} from 'alt-model/defi/defi_info_hooks';
import style from './defi_confirmation_page.module.scss';
import { useAmount } from 'alt-model/top_level_context';
import { Amount } from 'alt-model/assets';
import { RemoteAsset } from 'alt-model/types';

interface DefiConfirmationPageProps {
  recipe: DefiRecipe;
  composerState: DefiComposerState;
  lockedComposerPayload: DefiComposerPayload;
  flowDirection: FlowDirection;
  validationResult: DefiFormValidationResult;
  onSubmit: () => void;
  onClose: () => void;
}

function getInvestmentReturnLabel(recipe: DefiRecipe) {
  switch (recipe.investmentType) {
    case DefiInvestmentType.FIXED_YIELD:
      return 'ROI after maturity';
    case DefiInvestmentType.STAKING:
      return 'You will receive approximately';
    case DefiInvestmentType.BORROW:
    case DefiInvestmentType.YIELD:
    default:
      return '';
  }
}

function getTimeUntilMaturityInYears(timeToMaturity: bigint | undefined) {
  if (!timeToMaturity) return 0;
  const millisecondsInAYear = 31536000000;
  const ms = Number(timeToMaturity) * 1000;
  const now = Date.now();
  return (ms - now) / millisecondsInAYear;
}

function getROIAfterMaturity(amount: number | undefined, timeUntilMaturityInYears: number, annualYieldValue: number) {
  if (!amount) return 0;
  return amount * annualYieldValue * timeUntilMaturityInYears;
}

function getFixedYieldReturn(
  timeToMaturity: bigint | undefined,
  amount: Amount | undefined,
  annualYieldValue: number,
  asset: RemoteAsset,
) {
  const timeUntilMaturityInYears = getTimeUntilMaturityInYears(timeToMaturity);
  const roiAfterMaturity = getROIAfterMaturity(amount?.toFloat(), timeUntilMaturityInYears, annualYieldValue);
  return Amount.from(roiAfterMaturity, asset);
}

export function DefiConfirmationPage({
  recipe,
  composerState,
  lockedComposerPayload,
  flowDirection,
  validationResult,
  onSubmit,
  onClose,
}: DefiConfirmationPageProps) {
  const [riskChecked, setRiskChecked] = useState(false);
  const timeToMaturity = useDefaultAuxDataOption(recipe.id);
  const expectedYield = (useDefaultExpectedAssetYield(recipe) || 0) / 100;
  const amount = lockedComposerPayload.targetDepositAmount;
  const expectedOutput = useExpectedOutput(recipe.id, flowDirection, timeToMaturity, amount?.toAssetValue().value);
  const expectedStakingOutputAmount = useAmount(expectedOutput);
  const annualYieldValue = expectedYield || 0;

  const hasError = !!composerState?.error;
  const isIdle = composerState.phase === DefiComposerPhase.IDLE;
  const showingComplete = composerState.phase === DefiComposerPhase.DONE;
  const showingDeclaration = isIdle && !hasError;
  const asset = validationResult.input.depositAsset;
  const canSubmit = riskChecked && isIdle;
  const expectedFixedYieldOutputAmount = getFixedYieldReturn(timeToMaturity, amount, annualYieldValue, asset);

  return (
    <div className={style.page2Wrapper}>
      <CostBreakdown
        amountLabel="Amount"
        recipient={recipe.name}
        amount={amount}
        fee={lockedComposerPayload.feeAmount}
        investmentLabel={getInvestmentReturnLabel(recipe)}
        investmentReturn={
          recipe.investmentType === DefiInvestmentType.STAKING
            ? expectedStakingOutputAmount
            : expectedFixedYieldOutputAmount
        }
      />
      <BorderBox>
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
      </BorderBox>
      {!showingComplete && (
        <div className={style.footer}>
          <Button
            text={hasError ? 'Retry' : 'Confirm Transaction'}
            onClick={canSubmit ? onSubmit : undefined}
            disabled={!canSubmit}
          />
        </div>
      )}
    </div>
  );
}
