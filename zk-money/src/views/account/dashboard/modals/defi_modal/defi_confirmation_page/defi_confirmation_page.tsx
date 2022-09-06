import { useState } from 'react';
import { BorderBox, Button } from 'components';
import { Disclaimer } from '../../modal_molecules/disclaimer';
import { TransactionComplete } from '../../modal_molecules/transaction_complete';
import { CostBreakdown, CostBreakdownInvestmentInfo } from '../../modal_molecules/cost_breakdown';
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
  useExpectedOutput,
  useTermApr,
  useUnderlyingAmount,
} from 'alt-model/defi/defi_info_hooks';
import style from './defi_confirmation_page.module.scss';
import { useAmount } from 'alt-model/top_level_context';
import { Amount } from 'alt-model/assets';
import { RemoteAsset } from 'alt-model/types';
import { RetrySigningButton } from '../../modal_molecules/retry_signing_button';
import { getAssetPreferredFractionalDigits } from 'alt-model/known_assets/known_asset_display_data';
import { SkeletonRect } from 'ui-components';
import { formatBaseUnits } from 'app';

interface DefiConfirmationPageProps {
  recipe: DefiRecipe;
  composerState: DefiComposerState;
  lockedComposerPayload: DefiComposerPayload;
  flowDirection: FlowDirection;
  validationResult: DefiFormValidationResult;
  onSubmit: () => void;
  onClose: () => void;
}

function getTimeUntilMaturityInYears(maturityTimeInSeconds: number | undefined) {
  if (!maturityTimeInSeconds) return 0;
  const millisecondsInAYear = 31536000000;
  const ms = maturityTimeInSeconds * 1000;
  const now = Date.now();
  return (ms - now) / millisecondsInAYear;
}

function getROIAfterMaturity(amount: number | undefined, timeUntilMaturityInYears: number, annualYieldValue: number) {
  if (!amount) return 0n;
  return BigInt(Math.floor(amount * annualYieldValue * timeUntilMaturityInYears));
}

function getFixedYieldReturn(
  timeToMaturity: number | undefined,
  amount: number | undefined,
  annualYieldValue: number,
  asset: RemoteAsset,
) {
  const timeUntilMaturityInYears = getTimeUntilMaturityInYears(timeToMaturity);
  const roiAfterMaturity = getROIAfterMaturity(amount, timeUntilMaturityInYears, annualYieldValue);
  return new Amount(roiAfterMaturity, asset);
}

interface FieldProps {
  recipe: DefiRecipe;
  flowDirection: FlowDirection;
  auxData?: number;
  inputValue: bigint;
}

function RoiAfterMaturity(props: FieldProps) {
  const termApr = useTermApr(props.recipe, props.auxData, props.inputValue);
  const roiAmount =
    termApr !== undefined
      ? getFixedYieldReturn(props.auxData, Number(props.inputValue), termApr / 100, props.recipe.flow.enter.outA)
      : undefined;
  return <>{roiAmount?.format({ uniform: true })}</>;
}

function ExpectedOutputUnderlyingAssetValue(props: FieldProps) {
  const expectedOutput = useExpectedOutput(props.recipe.id, props.flowDirection, props.auxData, props.inputValue);
  const underlyingAsset = useUnderlyingAmount(props.recipe, expectedOutput?.value);
  if (!underlyingAsset) return <SkeletonRect sizingContent="100 zkETH" />;
  const formatted = formatBaseUnits(underlyingAsset.amount, underlyingAsset.decimals, {
    precision: getAssetPreferredFractionalDigits(underlyingAsset.address),
    commaSeparated: true,
  });
  return <>{`${formatted} zk${underlyingAsset.symbol}`}</>;
}

function ExpectedOutput(props: FieldProps) {
  const expectedOutput = useExpectedOutput(props.recipe.id, props.flowDirection, props.auxData, props.inputValue);
  const amount = useAmount(expectedOutput);
  return <>{amount?.format({ uniform: true })}</>;
}

function getInvestmentInfo(fieldProps: FieldProps): CostBreakdownInvestmentInfo | undefined {
  switch (fieldProps.recipe.investmentType) {
    case DefiInvestmentType.FIXED_YIELD:
      return {
        label: 'ROI after maturity',
        asset: fieldProps.recipe.flow.enter.outA,
        formattedValue: <RoiAfterMaturity {...fieldProps} />,
      };
    case DefiInvestmentType.YIELD:
    case DefiInvestmentType.STAKING: {
      const formattedConversionValue = fieldProps.recipe.hideUnderlyingOnExit ? undefined : (
        <ExpectedOutputUnderlyingAssetValue {...fieldProps} />
      );
      return {
        label: 'You will receive approximately',
        asset: fieldProps.recipe.flow.enter.outA,
        formattedValue: <ExpectedOutput {...fieldProps} />,
        formattedConversionValue,
      };
    }
  }
}

export function DefiConfirmationPage({
  recipe,
  composerState,
  lockedComposerPayload,
  flowDirection,
  onSubmit,
  onClose,
  validationResult,
}: DefiConfirmationPageProps) {
  const [riskChecked, setRiskChecked] = useState(false);
  const amount = lockedComposerPayload.targetDepositAmount;

  const hasError = !!composerState?.error;
  const isIdle = composerState.phase === DefiComposerPhase.IDLE;
  const showingComplete = composerState.phase === DefiComposerPhase.DONE;
  const showingDeclaration = isIdle && !hasError;
  const canSubmit = riskChecked && isIdle;
  const auxData = validationResult.input.bridgeCallData?.auxData;

  return (
    <div className={style.page2Wrapper}>
      <CostBreakdown
        amountLabel="Amount"
        recipient={recipe.name}
        amount={amount}
        fee={lockedComposerPayload.feeAmount}
        investmentInfo={getInvestmentInfo({ recipe, inputValue: amount.baseUnits, flowDirection, auxData })}
      />
      <BorderBox>
        {showingDeclaration ? (
          <Disclaimer accepted={riskChecked} onChangeAccepted={setRiskChecked} />
        ) : showingComplete ? (
          <TransactionComplete onClose={onClose} />
        ) : (
          <DefiSubmissionSteps composerState={composerState} />
        )}
      </BorderBox>
      {!showingComplete && (
        <div className={style.footer}>
          {recipe.id === 'element-finance.DAI-to-DAI' && (
            <div className={style.feedback}>Please be aware that your funds will be locked until maturity</div>
          )}
          {composerState.signingRetryable ? (
            <RetrySigningButton signingRetryable={composerState.signingRetryable} />
          ) : (
            <Button
              text={hasError ? 'Retry' : 'Confirm Transaction'}
              onClick={canSubmit ? onSubmit : undefined}
              disabled={!canSubmit}
            />
          )}
        </div>
      )}
    </div>
  );
}
