import { useState } from 'react';
import styled from 'styled-components/macro';
import { DefiComposerPhase, DefiComposerState } from '../../../../alt-model/defi/defi_composer';
import { Asset, toBaseUnits } from '../../../../app';
import { BorderBox, Button } from '../../../../components';
import { Breakdown } from './breakdown';
import { DefiSubmissionSteps } from './defi_submission_steps';
import { Disclaimer } from './disclaimer';
import { TransactionComplete } from './transaction_complete';
import { DefiFormFields } from './types';

const Root = styled.div`
  display: grid;
  gap: 50px;
`;

const LowerBorderBox = styled(BorderBox)`
  width: 600px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

interface Page2Props {
  composerState: DefiComposerState;
  asset: Asset;
  fields: DefiFormFields;
  fee: bigint | undefined;
  maxAmount: bigint;
  onSubmit: () => void;
}

export function Page2({ composerState, asset, maxAmount, fields, fee, onSubmit }: Page2Props) {
  const amount = toBaseUnits(fields.amountStr, asset.decimals);
  const [riskChecked, setRiskChecked] = useState(false);
  const hasError = composerState.erroredPhase !== undefined;
  const isIdle = composerState.phase === DefiComposerPhase.IDLE;
  const showingDeclaration = isIdle && !hasError;
  const showingComplete = composerState.phase === DefiComposerPhase.DONE;
  const canSubmit = riskChecked && isIdle;
  return (
    <Root>
      <BorderBox>
        <Breakdown amount={amount} fee={fee ?? 0n} asset={asset} />
      </BorderBox>
      <LowerBorderBox>
        {showingDeclaration ? (
          <Disclaimer accepted={riskChecked} onChangeAccepted={setRiskChecked} asset={asset} maxAmount={maxAmount} />
        ) : showingComplete ? (
          <TransactionComplete />
        ) : (
          <DefiSubmissionSteps composerState={composerState} />
        )}
      </LowerBorderBox>
      <Footer>
        <Button
          text={hasError ? 'Retry' : 'Confirm Submit'}
          onClick={riskChecked ? onSubmit : undefined}
          disabled={!canSubmit}
        />
      </Footer>
    </Root>
  );
}
